import type { Actions, PageServerLoad } from './$types';
import { SITE_CHAVE_API } from '$env/static/private';
import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/database/db.server';
import { leadsComprovanteTable, leadsTable, userTable } from '$lib/server/database/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ fetch, locals }) => {
	if (!locals.user) {
		return fail(401, {
			success: false,
			message: 'Não autorizado'
		});
	}

	const fetchLeadsByStatus = async (status: string) => {
		try {
			const response = await fetch(`/api/indicacoes/financeiro/${status}`, {
				method: 'GET',
				headers: {
					'API-KEY': SITE_CHAVE_API,
					'Content-Type': 'application/json'
				}
			});

			if (!response.ok) {
				throw new Error(`Erro ao buscar leads ${status}`);
			}

			return await response.json();
		} catch (err) {
			console.error(`Erro ao buscar leads ${status}:`, err);
			return [];
		}
	};

	const [aguardandoPagamento, pagos] = await Promise.all([
		fetchLeadsByStatus('aguardando'),
		fetchLeadsByStatus('pagos')
	]);

	return {
		leads: {
			aguardandoPagamento,
			pagos
		}
	};
};

export const actions: Actions = {
	updateStatus: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, {
				success: false,
				message: 'Não autorizado'
			});
		}

		try {
			const formData = await request.formData();
			const id = formData.get('id') as string;
			const status = formData.get('status') as string;
			const comprovante = formData.get('comprovante') as File | null;

			// Validação do status
			if (!['Aguardando Pagamento', 'Pago', 'Cancelado'].includes(status)) {
				return fail(400, {
					success: false,
					message: 'Status inválido para operação financeira'
				});
			}

			// Validação do comprovante apenas se não for cancelamento
			if (status !== 'Cancelado') {
				if (!comprovante) {
					return fail(400, {
						success: false,
						message: 'Comprovante é obrigatório para pagamentos'
					});
				}

				const validarComprovante = (arquivo: File) => {
					const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
					if (!tiposPermitidos.includes(arquivo.type)) return 'Formato de arquivo inválido';
					const maxSize = 5 * 1024 * 1024; // 5MB
					if (arquivo.size > maxSize) return 'Arquivo deve ter no máximo 5MB';
					return null;
				};

				const erroComprovante = validarComprovante(comprovante);
				if (erroComprovante) {
					return fail(400, {
						success: false,
						message: erroComprovante
					});
				}
			}

			// Processamento do comprovante se existir
			const processarComprovante = async (arquivo: File) => {
				const buffer = await arquivo.arrayBuffer();
				const base64 = Buffer.from(buffer).toString('base64');
				return `data:${arquivo.type};base64,${base64}`;
			};

			// Busca o lead
			const lead = await db.select().from(leadsTable).where(eq(leadsTable.id, id));
			if (!lead || lead.length === 0) {
				return fail(404, {
					success: false,
					message: 'Lead não encontrado'
				});
			}

			// Prepara os dados para atualização com os timestamps apropriados
			const now = new Date().toISOString();
			const updateData: {
				status: 'Aguardando Pagamento' | 'Pago' | 'Cancelado';
				pagoPor?: string;
				pagoEm?: string | null;
				aguardandoPagamentoEm?: string | null;
				canceladoEm?: string | null;
			} = {
				status: status as 'Aguardando Pagamento' | 'Pago' | 'Cancelado'
			};

			// Define o timestamp correspondente ao status
			if (status === 'Pago') {
				updateData.pagoPor = locals.user?.name;
				updateData.pagoEm = now;
			} else if (status === 'Aguardando Pagamento') {
				updateData.aguardandoPagamentoEm = now;
			} else if (status === 'Cancelado') {
				updateData.canceladoEm = now;

				// Decrementar o bônus de indicação do usuário indicador se o lead for cancelado
				if (lead[0].userIdPromoCode) {
					// Buscar o usuário indicador pelo ID
					const usuarioIndicador = await db
						.select()
						.from(userTable)
						.where(eq(userTable.id, lead[0].userIdPromoCode));

					if (usuarioIndicador && usuarioIndicador.length > 0) {
						// Decrementar o bônus de indicação, certificando que não fique negativo
						const bonusAtual = usuarioIndicador[0].bonusIndicacao || 0;
						const novoBonusIndicacao = Math.max(0, bonusAtual - 1);

						await db
							.update(userTable)
							.set({
								bonusIndicacao: novoBonusIndicacao
							})
							.where(eq(userTable.id, lead[0].userIdPromoCode));
					}
				}
			}

			// Atualiza o status do lead
			await db.transaction(async (tx) => {
				await tx.update(leadsTable).set(updateData).where(eq(leadsTable.id, id));

				// Salva o comprovante em tabela separada apenas se for pago e tiver comprovante
				if (status === 'Pago' && comprovante) {
					const comprovanteBase64 = await processarComprovante(comprovante);
					await tx.insert(leadsComprovanteTable).values({
						id: crypto.randomUUID(),
						leadsId: id,
						comprovante: comprovanteBase64
					});
				}
			});

			return {
				success: true,
				message: `Status atualizado para ${status} com sucesso`,
				newStatus: status
			};
		} catch (error) {
			console.error('Erro ao atualizar status:', error);
			return fail(500, {
				success: false,
				message: 'Erro ao atualizar status'
			});
		}
	}
};

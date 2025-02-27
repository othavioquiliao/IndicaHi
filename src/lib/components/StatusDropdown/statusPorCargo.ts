type StatusOption = {
	value: string;
	label: string;
};

export const STATUS_POR_CARGO: Record<string, StatusOption[]> = {
	'Vendedor Interno': [
		{ value: 'Pendente', label: 'Pendente' },
		{ value: 'Sendo Atendido', label: 'Sendo Atendido' },
		{ value: 'Finalizado', label: 'Finalizado' },
		{ value: 'Aguardando Pagamento', label: 'Aguardando Pagamento' },
		{ value: 'Cancelado', label: 'Cancelado' }
	],
	Financeiro: [
		{ value: 'Aguardando Pagamento', label: 'Aguardando Pagamento' },
		{ value: 'Pago', label: 'Pago' },
		{ value: 'Cancelado', label: 'Cancelado' }
	],
	Admin: [
		{ value: 'Pendente', label: 'Pendente' },
		{ value: 'Sendo Atendido', label: 'Sendo Atendido' },
		{ value: 'Finalizado', label: 'Finalizado' },
		{ value: 'Cancelado', label: 'Cancelado' },
		{ value: 'Cancelado', label: 'Cancelado' },
		{ value: 'Aguardando Pagamento', label: 'Aguardando Pagamento' },
		{ value: 'Pago', label: 'Pago' }
	]
};

export const getStatusPorCargo = (cargo: string): StatusOption[] => {
	return STATUS_POR_CARGO[cargo] || [];
};

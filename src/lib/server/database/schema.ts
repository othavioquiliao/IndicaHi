import { pgTable, text, timestamp, varchar, integer, boolean } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm/sql';

export const userTable = pgTable('user', {
	id: text('id').primaryKey().notNull(),
	name: varchar('name').notNull(),
	lastName: varchar('last_name').notNull(),
	email: varchar('email').notNull(),
	password: varchar('password').notNull(),
	job: varchar('job', { enum: ['Vendedor', 'Financeiro', 'Admin'] }).default('Vendedor'),
	cpf: varchar('cpf', { length: 11 }).unique(),
	telefone: varchar('telefone', { length: 11 }),
	promoCode: varchar('promo_code', { length: 15 }).unique(),
	pixType: varchar('pix_type', { enum: ['CPF', 'CNPJ', 'Email', 'Telefone', 'Chave Aleatória'] }),
	pixCode: text('pix_code').unique(),
	cep: varchar('cep', { length: 8 }),
	rua: varchar('rua', { length: 256 }),
	numeroCasa: integer('numero_casa'),
	complemento: varchar('complemento', { length: 256 }),
	bairro: varchar('bairro', { length: 256 }),
	cidade: varchar('cidade', { length: 256 }),
	estado: varchar('estado', { length: 2 }),
	status: boolean('status').default(true),
	createdAt: timestamp('created_at', {
		withTimezone: true,
		mode: 'date'
	})
		.defaultNow()
		.notNull()
});

export const sessionTable = pgTable('session', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => userTable.id),
	expiresAt: timestamp('expires_at', {
		withTimezone: true,
		mode: 'date'
	}).notNull()
});

// TODO: VErificar porque o banco nao desta criando o campo criado em created_at
export const leadsTable = pgTable('leads', {
	id: text('id').primaryKey().notNull(), // um identificador único para cada lead
	fullName: varchar('full_name').notNull(), // nome completo
	cpfCnpj: varchar('cpf_cnpj', { length: 14 }).unique().notNull(), // CPF ou CNPJ, dependendo do tipo de pessoa
	status: varchar('status', { enum: ['Pendente', 'Sendo Atendido', 'Finalizado', 'Sem Sucesso'] })
		.default('Pendente')
		.notNull(), // status do lead como enum
	promoCode: varchar('promo_code', { length: 15 }), // código promocional opcional
	createdAt: timestamp('created_at')
		.default(sql`now()`)
		.notNull(), // data e hora em que o lead foi criado

	attendedAt: timestamp('attended_at', {
		// data e hora em que o lead foi atendido
		withTimezone: true,
		mode: 'date'
	})
});

export type UserInsertSchema = typeof userTable.$inferInsert;
export type LeadsSchema = typeof leadsTable.$inferInsert;

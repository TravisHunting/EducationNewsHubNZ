import {sqliteTable,text,integer,index} from 'drizzle-orm/sqlite-core';
export const publications=sqliteTable('publications',{
 id:text('id').primaryKey(),sourceId:text('source_id').notNull(),
 retrievedAt:text('retrieved_at').notNull(),metadata:text('metadata').notNull(),
},t=>[index('publications_source_retrieved').on(t.sourceId,t.retrievedAt)]);
export const collectionSources=sqliteTable('collection_sources',{
 id:text('id').primaryKey(),nextAllowedAt:integer('next_allowed_at').notNull(),state:text('state'),
});

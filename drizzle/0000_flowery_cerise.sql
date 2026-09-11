CREATE TABLE `collection_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`next_allowed_at` integer NOT NULL,
	`state` text
);
--> statement-breakpoint
CREATE TABLE `publications` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`retrieved_at` text NOT NULL,
	`metadata` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `publications_source_retrieved` ON `publications` (`source_id`,`retrieved_at`);
CREATE TABLE `item_categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`transaction_id` integer NOT NULL,
	`name` text NOT NULL,
	`quantity` real,
	`unit` text,
	`unit_price_minor` integer,
	`line_total_minor` integer,
	`category_id` integer,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `item_categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `items_transaction_id_idx` ON `items` (`transaction_id`);--> statement-breakpoint
CREATE INDEX `items_category_id_idx` ON `items` (`category_id`);--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`merchant` text NOT NULL,
	`currency` text NOT NULL,
	`total_minor` integer NOT NULL,
	`transaction_time` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `transactions_transaction_time_idx` ON `transactions` (`transaction_time`);
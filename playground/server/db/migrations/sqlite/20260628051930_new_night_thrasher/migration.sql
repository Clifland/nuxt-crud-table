CREATE TABLE `products` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`name` text NOT NULL,
	`sku` text NOT NULL,
	`price` numeric NOT NULL,
	`stock` integer NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`name` text NOT NULL,
	`status` text DEFAULT 'active',
	`email` text NOT NULL UNIQUE,
	`avatar` text NOT NULL,
	`createdAt` integer NOT NULL
);

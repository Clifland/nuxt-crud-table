CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`name` text NOT NULL,
	`status` text DEFAULT 'active',
	`email` text NOT NULL UNIQUE,
	`avatar` text NOT NULL,
	`createdAt` integer NOT NULL
);

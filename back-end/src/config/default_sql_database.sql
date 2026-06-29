CREATE TABLE `users` (
    `id` int PRIMARY KEY AUTO_INCREMENT,
    `username` VARCHAR(255) UNIQUE NOT NULL,
    `password_hash` text NOT NULL,
    `email` VARCHAR(255) UNIQUE NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_log` int
);

CREATE TABLE `user_permissions` (
    `id` int PRIMARY KEY AUTO_INCREMENT,
    `user_id` int NOT NULL,
    `permission` ENUM ('USER', 'GLOBAL_ADMIN', 'USER_ADMIN', 'EVENT_ADMIN') NOT NULL DEFAULT 'USER',
    `enabled` boolean NOT NULL DEFAULT false,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_log` int
);

CREATE TABLE `events` (
    `id` int PRIMARY KEY AUTO_INCREMENT,
    `title` VARCHAR(255) NOT NULL,
    `description` text,
    `creator_user` int NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_log` int,
    `status` ENUM ('DRAFT', 'OPEN', 'CLOSED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT'
);

CREATE TABLE `event_dates` (
    `id` int PRIMARY KEY AUTO_INCREMENT,
    `event_id` int NOT NULL,
    `date` date NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_log` int
);

CREATE TABLE `event_locations` (
    `id` int PRIMARY KEY AUTO_INCREMENT,
    `event_id` int NOT NULL,
    `location_id` int NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_log` int
);

CREATE TABLE `invitation` (
    `id` int PRIMARY KEY AUTO_INCREMENT,
    `user_id` int NOT NULL,
    `event_id` int NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_log` int,
    `role` ENUM ('GUEST', 'DATE_PICKER', 'LOCATION_PICKER', 'ORGANIZER') NOT NULL DEFAULT 'GUEST'
);

CREATE TABLE `locations` (
    `id` int PRIMARY KEY AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `creator_user` int NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_log` int
);

CREATE TABLE `date_response` (
    `id` int PRIMARY KEY AUTO_INCREMENT,
    `invitation_id` int NOT NULL,
    `date_id` int NOT NULL,
    `state` ENUM ('YES', 'NO', 'MAYBE', 'QUESTION', 'NO_RESPONSE') NOT NULL DEFAULT 'NO_RESPONSE',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_log` int
);

CREATE TABLE `location_response` (
    `id` int PRIMARY KEY AUTO_INCREMENT,
    `invitation_id` int NOT NULL,
    `location_id` int NOT NULL,
    `state` ENUM ('YES', 'NO', 'MAYBE', 'QUESTION', 'NO_RESPONSE') NOT NULL DEFAULT 'NO_RESPONSE',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_log` int
);

CREATE TABLE `log` (
    `id` int PRIMARY KEY AUTO_INCREMENT,
    `table_name` varchar(50),
    `where_clause` varchar(250),
    `action` varchar(50),
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `query` text,
    `executioner_id` int
);

ALTER TABLE `users` ADD FOREIGN KEY (`updated_log`) REFERENCES `log` (`id`);

ALTER TABLE `user_permissions` ADD FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);
ALTER TABLE `user_permissions` ADD FOREIGN KEY (`updated_log`) REFERENCES `log` (`id`);

ALTER TABLE `events` ADD FOREIGN KEY (`creator_user`) REFERENCES `users` (`id`);
ALTER TABLE `events` ADD FOREIGN KEY (`updated_log`) REFERENCES `log` (`id`);

ALTER TABLE `event_dates` ADD FOREIGN KEY (`event_id`) REFERENCES `events` (`id`);
ALTER TABLE `event_dates` ADD FOREIGN KEY (`updated_log`) REFERENCES `log` (`id`);

ALTER TABLE `event_locations` ADD FOREIGN KEY (`event_id`) REFERENCES `events` (`id`);
ALTER TABLE `event_locations` ADD FOREIGN KEY (`location_id`) REFERENCES `locations` (`id`);
ALTER TABLE `event_locations` ADD FOREIGN KEY (`updated_log`) REFERENCES `log` (`id`);

ALTER TABLE `invitation` ADD FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);
ALTER TABLE `invitation` ADD FOREIGN KEY (`event_id`) REFERENCES `events` (`id`);
ALTER TABLE `invitation` ADD FOREIGN KEY (`updated_log`) REFERENCES `log` (`id`);

ALTER TABLE `locations` ADD FOREIGN KEY (`creator_user`) REFERENCES `users` (`id`);
ALTER TABLE `locations` ADD FOREIGN KEY (`updated_log`) REFERENCES `log` (`id`);

ALTER TABLE `date_response` ADD FOREIGN KEY (`invitation_id`) REFERENCES `invitation` (`id`);
ALTER TABLE `date_response` ADD FOREIGN KEY (`date_id`) REFERENCES `event_dates` (`id`);
ALTER TABLE `date_response` ADD FOREIGN KEY (`updated_log`) REFERENCES `log` (`id`);

ALTER TABLE `location_response` ADD FOREIGN KEY (`invitation_id`) REFERENCES `invitation` (`id`);
ALTER TABLE `location_response` ADD FOREIGN KEY (`location_id`) REFERENCES `event_locations` (`id`);
ALTER TABLE `location_response` ADD FOREIGN KEY (`updated_log`) REFERENCES `log` (`id`);

ALTER TABLE `log` ADD FOREIGN KEY (`executioner_id`) REFERENCES `users` (`id`);

ALTER TABLE `invitation` ADD UNIQUE KEY `unique_invite` (`user_id`, `event_id`);

ALTER TABLE `date_response` ADD UNIQUE KEY `unique_date_vote` (`invitation_id`, `date_id`);

ALTER TABLE `location_response` ADD UNIQUE KEY `unique_loc_vote` (`invitation_id`, `location_id`);

ALTER TABLE `user_permissions` ADD UNIQUE KEY `unique_perm` (`user_id`, `permission`);
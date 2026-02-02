export interface User {
    id: number,
    username: string,
    password_hash: string,
    email: string
}

export interface Event {
    id: number,
    title: string,
    description: string | null,
    creator_user: number
}

export interface Location {
    id: number,
    name: string,
    creator_user: number
}
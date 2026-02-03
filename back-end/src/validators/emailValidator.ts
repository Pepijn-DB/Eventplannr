export function emailValidator(email: string):boolean {
    return ((email.split("@").length === 2) || (email.split(".").length >= 2));
}
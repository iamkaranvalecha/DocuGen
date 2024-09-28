export class ConfigNotFoundError extends Error {
    constructor(message: string) {
        super(message);
    }
}

export class SecretProviderNotFoundError extends Error {
    constructor(message: string) {
        super(message);
    }
}

export class InvalidConfigError extends Error {
    constructor(message: string) {
        super(message);
    }
}

export class InvalidSecretProviderError extends Error {
    constructor(message: string) {
        super(message);
    }
}

export class InvalidSectionConfigError extends Error {
    constructor(message: string) {
        super(message);
    }
}
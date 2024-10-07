"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvalidSectionConfigError = exports.InvalidSecretProviderError = exports.InvalidConfigError = exports.SecretProviderNotFoundError = exports.ConfigNotFoundError = void 0;
class ConfigNotFoundError extends Error {
    constructor(message) {
        super(message);
    }
}
exports.ConfigNotFoundError = ConfigNotFoundError;
class SecretProviderNotFoundError extends Error {
    constructor(message) {
        super(message);
    }
}
exports.SecretProviderNotFoundError = SecretProviderNotFoundError;
class InvalidConfigError extends Error {
    constructor(message) {
        super(message);
    }
}
exports.InvalidConfigError = InvalidConfigError;
class InvalidSecretProviderError extends Error {
    constructor(message) {
        super(message);
    }
}
exports.InvalidSecretProviderError = InvalidSecretProviderError;
class InvalidSectionConfigError extends Error {
    constructor(message) {
        super(message);
    }
}
exports.InvalidSectionConfigError = InvalidSectionConfigError;
//# sourceMappingURL=exceptions.js.map
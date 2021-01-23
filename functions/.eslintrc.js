module.exports = {
    "env": {
        "browser": true,
        "es6": true
    },
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
        "project": "tsconfig.json",
        "sourceType": "module"
    },
    "plugins": [
        "eslint-plugin-import",
        "@typescript-eslint"
    ],
    "extends": [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
    ],
    "rules": {
        "@typescript-eslint/no-floating-promises": "error",
        "@typescript-eslint/no-shadow": [
            "error",
            {
                "hoist": "all"
            }
        ],
        "@typescript-eslint/no-unnecessary-type-assertion": "error",
        "@typescript-eslint/prefer-for-of": "warn",
        "@typescript-eslint/unified-signatures": "warn",
        "comma-dangle": ["error", "always-multiline"],
        "eqeqeq": [
            "error",
            "always"
        ],
        "import/no-deprecated": "error",
        "import/no-extraneous-dependencies": "error",
        "import/no-unassigned-import": "error",
        "no-duplicate-imports": "error",
        "no-empty": [
            "error",
            {
                "allowEmptyCatch": true
            }
        ],
        "no-invalid-this": "error",
        "no-new-wrappers": "error",
        "no-sequences": "error",
        "no-throw-literal": "error",
        "no-var": "error",
        "no-void": "error",
        "prefer-const": "error"
    }
};

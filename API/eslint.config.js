import js from "@eslint/js";
import globals from "globals";

export default [
	js.configs.recommended,
	{
		languageOptions: {
			ecmaVersion: "latest",
			sourceType: "module",
			globals: {
				...globals.node, // Pour reconnaître 'process', 'console', etc.
				...globals.jasmine, // Pour reconnaître describe, it, expect
			},
		},
		rules: {
			"indent": ["error", "tab"], // Consigne du TP
			"no-unused-vars": "warn",   // Optionnel : évite que ça bloque pour une variable non utilisée
		},
	},
];
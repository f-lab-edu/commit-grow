import sortClassMembers from "eslint-plugin-sort-class-members";
import tseslint from "typescript-eslint";

export default tseslint.config(
	{
		ignores: ["**/dist/**", "**/node_modules/**", "**/coverage/**"],
	},
	{
		files: ["**/*.ts"],
		plugins: {
			"@typescript-eslint": tseslint.plugin,
			"sort-class-members": sortClassMembers,
		},
		languageOptions: {
			parser: tseslint.parser,
		},
		rules: {
			"lines-between-class-members": [
				"error",
				"always",
				{ exceptAfterSingleLine: false },
			],
			"sort-class-members/sort-class-members": [
				"error",
				{
					order: [
						{ type: "property" },
						"constructor",
						{ type: "method", static: true, kind: "nonAccessor" },
						{
							type: "method",
							accessibility: "public",
							kind: "nonAccessor",
						},
						{
							type: "method",
							accessibility: "private",
							kind: "nonAccessor",
						},
						{ kind: "get" },
						{ kind: "set" },
					],
					accessorPairPositioning: "getThenSet",
				},
			],
		},
	},
);

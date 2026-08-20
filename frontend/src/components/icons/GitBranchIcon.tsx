import type { SVGProps } from "react";

export function GitBranchIcon(props: SVGProps<SVGSVGElement>) {
	return (
		<svg viewBox="0 0 16 16" aria-hidden="true" {...props}>
			<circle cx="4" cy="3" r="1.6" fill="currentColor" />
			<circle cx="4" cy="13" r="1.6" fill="currentColor" />
			<circle cx="12" cy="6" r="1.6" fill="currentColor" />
			<path
				d="M4 4.6v6.8M4 8c2 0 3.5-.5 5-2l1.5-1.5"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.4"
				strokeLinecap="round"
			/>
		</svg>
	);
}

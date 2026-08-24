import type { SVGProps } from "react";

export function CheckIcon(props: SVGProps<SVGSVGElement>) {
	return (
		<svg viewBox="0 0 16 16" aria-hidden="true" {...props}>
			<path
				d="M3 8.5l3.3 3.3L13 5"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.8"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

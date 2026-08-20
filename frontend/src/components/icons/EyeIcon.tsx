import type { SVGProps } from "react";

export function EyeIcon(props: SVGProps<SVGSVGElement>) {
	return (
		<svg viewBox="0 0 16 16" aria-hidden="true" {...props}>
			<path
				d="M1 8C2.5 4.7 5.2 3 8 3s5.5 1.7 7 5c-1.5 3.3-4.2 5-7 5s-5.5-1.7-7-5z"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.4"
				strokeLinejoin="round"
			/>
			<circle cx="8" cy="8" r="2" fill="currentColor" />
		</svg>
	);
}

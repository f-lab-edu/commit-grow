import type { SVGProps } from "react";

export function ArrowClockwiseIcon(props: SVGProps<SVGSVGElement>) {
	return (
		<svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
			<path
				d="M13.5 8A5.5 5.5 0 1 1 11.9 4.1"
				stroke="currentColor"
				strokeWidth="1.4"
				strokeLinecap="round"
			/>
			<path
				d="M12 1.5v3h-3"
				stroke="currentColor"
				strokeWidth="1.4"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

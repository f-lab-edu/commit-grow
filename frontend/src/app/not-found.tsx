import Link from "next/link";

export default function NotFound() {
	return (
		<div className="flex flex-1 flex-col items-center justify-center gap-4">
			<h1 className="text-2xl font-bold">404</h1>
			<p className="text-sm">페이지를 찾을 수 없습니다.</p>
			<Link href="/" className="underline">
				홈으로
			</Link>
		</div>
	);
}

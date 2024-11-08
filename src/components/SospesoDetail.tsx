import {
  browserClipboardApi,
  type ClipboardApiI,
} from "@/adapters/clipboardApi";
import { href, Link } from "@/routing";

export function SospesoDetail({
  sospeso,
  clipboardApi = browserClipboardApi,
}: {
  sospeso:
    | {
        id: string;
        from: string;
        to: string;
        status: "issued" | "pending";
        consuming: undefined;
      }
    | {
        id: string;
        from: string;
        to: string;
        status: "consumed";
        consuming: {
          consumer: { id: string; nickname: string };
          content: string;
        };
      };
  clipboardApi?: ClipboardApiI;
}) {
  return (
    <div>
      <p>From. {sospeso.from}</p>
      <p>To. {sospeso.to}</p>
      {sospeso.status === "issued" && (
        <Link
          className="btn btn-primary"
          routeKey="소스페소-신청"
          params={{ sospesoId: sospeso.id }}
        >
          신청하기
        </Link>
      )}

      {sospeso.status === "pending" && (
        <button className="btn btn-primary" disabled>
          대기중
        </button>
      )}

      {sospeso.status === "consumed" && <img alt="사용됨" />}

      {sospeso.status === "consumed" && (
        <div>
          <span>{sospeso.consuming.consumer.nickname}</span>
          <p>{sospeso.consuming.content}</p>
        </div>
      )}

      <button
        className="btn btn-primary"
        onClick={() => {
          clipboardApi.copy(
            window.origin + href("소스페소-상세", { sospesoId: sospeso.id }),
          );
        }}
      >
        공유 링크 복사하기
      </button>
    </div>
  );
}

import invariant from "../invariant";

export type SospesoIssuing = {
  id: string;

  issuedAt: Date;
};

export type SospesoApplication = {
  id: string;
  status: "applied" | "approved" | "rejected";

  appliedAt: Date;
};

export type SospesoApplicationStatus = SospesoApplication["status"];

export type SospesoConsuming = {
  id: string;
  // 후기 -> 공개
  content: string;
  // 메모 -> 장소, 시간, 내용, 코칭 일지 링크 (markdown? markdown editor?)
  memo: string; // markdown
  // 최종적으로 코칭을 받은 사람의 id => userId
  consumerId: string; // user.id
  // coachId => userId
  coachId: string; // user.id

  consumedAt: Date;
};

export type Sospeso = {
  id: string;
  from: string;
  to: string; // <- 수혜자 조건
  issuing: SospesoIssuing;
  applicationList: SospesoApplication[];
  consuming: SospesoConsuming | undefined;
};

export function isApproved(sospeso: Sospeso) {
  return sospeso.applicationList.some(
    (application) => application.status === "approved",
  );
}

export function isConsumed(sospeso: Sospeso) {
  return sospeso.consuming !== undefined;
}

type SospesoIssuingCommand = {
  sospesoId: string;
  issuedAt: Date;
  from: string;
  to: string;
};

/**
 * 소스페소를 발행합니다
 * @param command
 * @returns 발행된 소스페소
 */
export function issueSospeso(command: SospesoIssuingCommand): Sospeso {
  return {
    id: command.sospesoId,
    from: command.from,
    to: command.to,
    issuing: {
      id: command.sospesoId,
      issuedAt: command.issuedAt,
    },
    applicationList: [],
    consuming: undefined,
  };
}

type SospesoApplicationCommand = {
  sospesoId: string;
  applicationId: string;
  applicationMsg: string;
  appliedAt: Date;
};

export function isApplicationLocked(sospeso: Sospeso) {
  return sospeso.applicationList.some(
    (application) =>
      application.status === "applied" || application.status === "approved",
  );
}

export function applySospeso(
  sospeso: Sospeso,
  command: SospesoApplicationCommand,
): Sospeso {
  invariant(
    sospeso.id === command.sospesoId,
    "소스페소와 커맨드의 id가 다릅니다!",
  );

  if (isApplicationLocked(sospeso)) {
    throw new Error("[Conflict Error] 소스페소를 이미 신청한 사람이 있습니다.");
  }

  return {
    ...sospeso,
    applicationList: [
      ...sospeso.applicationList,
      {
        id: command.applicationId,
        appliedAt: command.appliedAt,
        status: "applied",
      },
    ],
  };
}

type SospesoApplicationApproveCommand = {
  sospesoId: string;
  applicationId: string;
};

export function approveApplication(
  sospeso: Sospeso,
  command: SospesoApplicationApproveCommand,
): Sospeso {
  invariant(
    sospeso.id === command.sospesoId,
    "소스페소와 커맨드의 id가 다릅니다!",
  );
  invariant(
    sospeso.applicationList.some(
      (application) => application.id === command.applicationId,
    ),
    "이 소스페소에 신청된 적이 없는 id입니다!",
  );
  invariant(!isApproved(sospeso), "이미 승인된 소스페소입니다!");

  return {
    ...sospeso,
    applicationList: sospeso.applicationList.map((application) => {
      if (application.id === command.applicationId) {
        return { ...application, status: "approved" };
      }
      return application;
    }),
  };
}

type SospesoApplicationRejectCommand = {
  sospesoId: string;
  applicationId: string;
};

export function rejectApplication(
  sospeso: Sospeso,
  command: SospesoApplicationRejectCommand,
): Sospeso {
  invariant(
    sospeso.id === command.sospesoId,
    "소스페소와 커맨드의 id가 다릅니다!",
  );
  invariant(
    sospeso.applicationList.some(
      (application) => application.id === command.applicationId,
    ),
    "이 소스페소에 신청된 적이 없는 id입니다",
  );

  return {
    ...sospeso,
    applicationList: sospeso.applicationList.map((application) => {
      if (application.id === command.applicationId) {
        return { ...application, status: "rejected" };
      }
      return application;
    }),
  };
}

export function consumeSospeso(
  sospeso: Sospeso,
  command: {
    sospesoId: string;
    consumingId: string;
    consumedAt: Date;
    content: string;
    memo: string;
    consumerId: string;
    coachId: string;
  },
): Sospeso {
  invariant(
    sospeso.id === command.sospesoId,
    "소스페소와 커맨드의 id가 다릅니다!",
  );
  invariant(isApproved(sospeso), "승인되지 않은 소스페소입니다!");

  return {
    ...sospeso,
    consuming: {
      id: command.consumingId,
      consumedAt: command.consumedAt,
      content: command.content,
      memo: command.memo,
      consumerId: command.consumerId,
      coachId: command.coachId,
    },
  };
}

export function calcStatus(
  sospeso: Sospeso,
): "issued" | "pending" | "consumed" {
  if (isConsumed(sospeso)) {
    return "consumed";
  }
  if (isApplicationLocked(sospeso)) {
    return "pending";
  }
  return "issued";
}

import { describe, expect, test } from "vitest";
import {
  applySospeso,
  approveApplication,
  isApplicationLocked,
  issueSospeso,
  isConsumed,
  rejectApplication,
  consumeSospeso,
  isApproved,
  calcStatus,
  issueSospesoBundle,
} from "./domain.ts";
import { SOSPESO_PRICE } from "./constants.ts";
import { TEST_ADMIN_USER_ID, TEST_USER_ID } from "@/auth/fixtures.ts";
import { generateNanoId } from "@/adapters/generateId.ts";

const generateId = generateNanoId;

const sospesoId = generateId();
const now = new Date();

export const issuedSospeso = issueSospeso({
  sospesoId: sospesoId,
  issuedAt: now,
  from: "탐정토끼",
  to: "퀴어 문화 축제 올 사람",
  paidAmount: SOSPESO_PRICE,
  issuerId: TEST_USER_ID,
});

export const issuedSospesoBundle = issueSospesoBundle({
  sospesoId: sospesoId,
  issuedAt: now,
  from: "탐정토끼",
  to: "책읽기 모임 4회 참여할 사람",
  paidAmount: SOSPESO_PRICE,
  issuerId: TEST_USER_ID,
  amount: 4,
  item: "책읽기 클래스 1시간 반",
});

const firstApplicationId = generateId();

export const appliedSospeso = applySospeso(issuedSospeso, {
  sospesoId: issuedSospeso.id,
  applicationId: firstApplicationId,
  appliedAt: new Date(),
  applicantId: TEST_USER_ID,
  content: "",
});

export const approvedSospeso = approveApplication(appliedSospeso, {
  sospesoId: issuedSospeso.id,
  applicationId: firstApplicationId,
});

describe("sospeso", () => {
  test("소스페소를 발행할 수 있다.", () => {
    expect(issuedSospeso.id).toBe(sospesoId);

    expect(issuedSospeso.issuing.id).toBe(sospesoId);
    expect(issuedSospeso.issuing.issuedAt).toBe(now);
    expect(issuedSospeso.issuing.paidAmount).toBe(80000);

    expect(issuedSospeso.applicationList).toHaveLength(0);
    expect(isConsumed(issuedSospeso)).toBe(false);
  });

  test("소스페소에 신청할 수 있다", () => {
    expect(appliedSospeso.applicationList).toHaveLength(1);
    expect(isApproved(issuedSospeso)).toBe(false);
    expect(isConsumed(issuedSospeso)).toBe(false);
  });

  test("하나의 소스페소에 두 번 신청할 수는 없다", () => {
    expect(() => {
      applySospeso(appliedSospeso, {
        sospesoId: issuedSospeso.id,
        applicationId: generateNanoId(),
        appliedAt: new Date(),
        applicantId: TEST_USER_ID,
        content: "",
      });
    }).toThrowError("[Conflict Error] 소스페소를 이미 신청한 사람이 있습니다.");
  });

  test("소스페소 신청을 승인할 수 있다", () => {
    expect(isApproved(approvedSospeso)).toEqual(true);
  });

  const rejectedSospeso = rejectApplication(appliedSospeso, {
    sospesoId: issuedSospeso.id,
    applicationId: firstApplicationId,
  });

  test("소스페소 신청을 거절할 수 있다", () => {
    expect(
      rejectedSospeso.applicationList.map((application) => application.status),
    ).toEqual(["rejected"]);
  });

  test("이미 승인한 소스페소 신청도 소스페소 신청도 취소할 수 있다", () => {
    const reversedApplication = rejectApplication(approvedSospeso, {
      sospesoId: issuedSospeso.id,
      applicationId: firstApplicationId,
    });

    expect(
      reversedApplication.applicationList.map(
        (application) => application.status,
      ),
    ).toEqual(["rejected"]);
  });

  test("거절한 소스페소는 다시 신청할 수 있다", () => {
    expect(isApplicationLocked(rejectedSospeso)).toBe(false);

    const secondApplicationId = generateId();

    const appliedSospeso = applySospeso(rejectedSospeso, {
      sospesoId: rejectedSospeso.id,
      applicationId: secondApplicationId,
      appliedAt: new Date(),
      applicantId: TEST_USER_ID,
      content: "",
    });

    const approvedSospeso = approveApplication(appliedSospeso, {
      sospesoId: appliedSospeso.id,
      applicationId: secondApplicationId,
    });

    expect(approvedSospeso.applicationList.map((a) => a.status)).toEqual([
      "rejected",
      "approved",
    ]);
  });

  test("두 번 이상 거절할 수도 있다", () => {
    const secondApplicationId = generateId();

    const appliedSospeso = applySospeso(rejectedSospeso, {
      sospesoId: rejectedSospeso.id,
      applicationId: secondApplicationId,
      applicantId: TEST_USER_ID,
      appliedAt: new Date(),
      content: "",
    });

    const rejectedAgainSospeso = rejectApplication(appliedSospeso, {
      sospesoId: appliedSospeso.id,
      applicationId: secondApplicationId,
    });

    expect(rejectedAgainSospeso.applicationList.map((a) => a.status)).toEqual([
      "rejected",
      "rejected",
    ]);
  });

  const CONSUME_COMMAND = {
    sospesoId: issuedSospeso.id,
    consumingId: generateNanoId(),
    consumedAt: new Date(),
    content: "너무 도움이 되었어요! 덕분에 취직도 잘할듯?",
    memo: "장소: 약수역, 시간: 2022년 12월 11일, 어찌저찌 큰 도움이 되셨다고.",
    consumerId: TEST_USER_ID,
    coachId: TEST_ADMIN_USER_ID,
  };
  const consumedSospeso = consumeSospeso(approvedSospeso, CONSUME_COMMAND);

  test("승인된 소스페소를 사용 처리할 수 있다", () => {
    expect(isConsumed(approvedSospeso)).toBe(false);

    expect(isConsumed(consumedSospeso)).toBe(true);
  });

  test("승인된 신청자가 아니면 사용할 수 없다", () => {
    expect(() =>
      consumeSospeso(approvedSospeso, {
        ...CONSUME_COMMAND,
        consumerId: generateNanoId(),
      }),
    ).toThrowError("승인된 사람만 소스페소를 사용할 수 있습니다");
  });

  // 소스페소 상태 3가지 "issued" | "pending" | "consumed"
  test("막 발행되었거나, 누군가 신청했지만 거절된 소스페소는 issued 상태다", () => {
    expect(calcStatus(issuedSospeso)).toBe("issued");
    expect(calcStatus(rejectedSospeso)).toBe("issued");
  });
  test("누가 신청을 했거나, 승인된 소스페소는 pending 상태다", () => {
    expect(calcStatus(appliedSospeso)).toBe("pending");
    expect(calcStatus(approvedSospeso)).toBe("pending");
  });
  test("누군가 이미 사용한 소스페소는 consumed 상태다", () => {
    expect(calcStatus(consumedSospeso)).toBe("consumed");
  });
});

describe("sospeso-bundle", () => {
  test("여러 건의 소스페소를 발행할 수 있다.", () => {
    expect(issuedSospesoBundle.id).toBe(sospesoId);

    expect(issuedSospesoBundle.issuing.id).toBe(sospesoId);
    expect(issuedSospesoBundle.issuing.issuedAt).toBe(now);
    expect(issuedSospesoBundle.amount).toBe(4);
    expect(issuedSospesoBundle.issuing.paidAmount).toBe(SOSPESO_PRICE * 4);

    expect(issuedSospesoBundle.applicationList).toHaveLength(0);
    expect(isConsumed(issuedSospesoBundle)).toBe(false);
  });

  test("소스페소에 신청할 수 있다", () => {
    expect(appliedSospeso.applicationList).toHaveLength(1);
    expect(isApproved(issuedSospeso)).toBe(false);
    expect(isConsumed(issuedSospeso)).toBe(false);
  });

  test("하나의 소스페소에 두 번 신청할 수는 없다", () => {
    expect(() => {
      applySospeso(appliedSospeso, {
        sospesoId: issuedSospeso.id,
        applicationId: generateNanoId(),
        appliedAt: new Date(),
        applicantId: TEST_USER_ID,
        content: "",
      });
    }).toThrowError("[Conflict Error] 소스페소를 이미 신청한 사람이 있습니다.");
  });

  test("소스페소 신청을 승인할 수 있다", () => {
    expect(isApproved(approvedSospeso)).toEqual(true);
  });

  const rejectedSospeso = rejectApplication(appliedSospeso, {
    sospesoId: issuedSospeso.id,
    applicationId: firstApplicationId,
  });

  test("소스페소 신청을 거절할 수 있다", () => {
    expect(
      rejectedSospeso.applicationList.map((application) => application.status),
    ).toEqual(["rejected"]);
  });

  test("이미 승인한 소스페소 신청도 소스페소 신청도 취소할 수 있다", () => {
    const reversedApplication = rejectApplication(approvedSospeso, {
      sospesoId: issuedSospeso.id,
      applicationId: firstApplicationId,
    });

    expect(
      reversedApplication.applicationList.map(
        (application) => application.status,
      ),
    ).toEqual(["rejected"]);
  });

  test("거절한 소스페소는 다시 신청할 수 있다", () => {
    expect(isApplicationLocked(rejectedSospeso)).toBe(false);

    const secondApplicationId = generateId();

    const appliedSospeso = applySospeso(rejectedSospeso, {
      sospesoId: rejectedSospeso.id,
      applicationId: secondApplicationId,
      appliedAt: new Date(),
      applicantId: TEST_USER_ID,
      content: "",
    });

    const approvedSospeso = approveApplication(appliedSospeso, {
      sospesoId: appliedSospeso.id,
      applicationId: secondApplicationId,
    });

    expect(approvedSospeso.applicationList.map((a) => a.status)).toEqual([
      "rejected",
      "approved",
    ]);
  });

  test("두 번 이상 거절할 수도 있다", () => {
    const secondApplicationId = generateId();

    const appliedSospeso = applySospeso(rejectedSospeso, {
      sospesoId: rejectedSospeso.id,
      applicationId: secondApplicationId,
      applicantId: TEST_USER_ID,
      appliedAt: new Date(),
      content: "",
    });

    const rejectedAgainSospeso = rejectApplication(appliedSospeso, {
      sospesoId: appliedSospeso.id,
      applicationId: secondApplicationId,
    });

    expect(rejectedAgainSospeso.applicationList.map((a) => a.status)).toEqual([
      "rejected",
      "rejected",
    ]);
  });

  const CONSUME_COMMAND = {
    sospesoId: issuedSospeso.id,
    consumingId: generateNanoId(),
    consumedAt: new Date(),
    content: "너무 도움이 되었어요! 덕분에 취직도 잘할듯?",
    memo: "장소: 약수역, 시간: 2022년 12월 11일, 어찌저찌 큰 도움이 되셨다고.",
    consumerId: TEST_USER_ID,
    coachId: TEST_ADMIN_USER_ID,
  };
  const consumedSospeso = consumeSospeso(approvedSospeso, CONSUME_COMMAND);

  test("승인된 소스페소를 사용 처리할 수 있다", () => {
    expect(isConsumed(approvedSospeso)).toBe(false);

    expect(isConsumed(consumedSospeso)).toBe(true);
  });

  test("승인된 신청자가 아니면 사용할 수 없다", () => {
    expect(() =>
      consumeSospeso(approvedSospeso, {
        ...CONSUME_COMMAND,
        consumerId: generateNanoId(),
      }),
    ).toThrowError("승인된 사람만 소스페소를 사용할 수 있습니다");
  });

  // 소스페소 상태 3가지 "issued" | "pending" | "consumed"
  test("막 발행되었거나, 누군가 신청했지만 거절된 소스페소는 issued 상태다", () => {
    expect(calcStatus(issuedSospeso)).toBe("issued");
    expect(calcStatus(rejectedSospeso)).toBe("issued");
  });
  test("누가 신청을 했거나, 승인된 소스페소는 pending 상태다", () => {
    expect(calcStatus(appliedSospeso)).toBe("pending");
    expect(calcStatus(approvedSospeso)).toBe("pending");
  });
  test("누군가 이미 사용한 소스페소는 consumed 상태다", () => {
    expect(calcStatus(consumedSospeso)).toBe("consumed");
  });
});

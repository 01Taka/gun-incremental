import { INVOICE_CONFIG } from "../../config/gameData";
import { VOCAB } from "../../config/vocab";

/**
 * 上納金システムが既に解禁・出現しているかどうかを判定
 */
export function checkHasInvoiceAppeared(params: {
  round: number;
  invoiceIntroduced: boolean;
  invoiceCount: number;
}): boolean {
  return (
    params.invoiceIntroduced ||
    params.invoiceCount > 0 ||
    params.round >= INVOICE_CONFIG.intervalRounds
  );
}

/**
 * 次回上納金までの案内文（通常・切迫警告テキスト）を生成
 */
export function getInvoiceNoticeText(
  roundsRemaining: number,
  formattedCost: string,
): {
  isUrgent: boolean;
  noticeText: string;
} {
  const isUrgent = roundsRemaining === 1;
  const noticeText = isUrgent
    ? VOCAB.progression.invoiceDueNextRound(formattedCost)
    : VOCAB.progression.invoiceDueInRounds(roundsRemaining, formattedCost);

  return { isUrgent, noticeText };
}

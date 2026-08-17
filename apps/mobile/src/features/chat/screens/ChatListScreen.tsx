import React from "react";
import { useTranslation } from "react-i18next";
import { ComingSoon } from "../../../components/ComingSoon";

export function ChatListScreen() {
  const { t } = useTranslation();
  return <ComingSoon title={t("chat.title")} message={t("chat.comingSoon")} />;
}

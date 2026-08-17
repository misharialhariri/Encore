import React from "react";
import { useTranslation } from "react-i18next";
import { ComingSoon } from "../../../components/ComingSoon";

export function SellScreen() {
  const { t } = useTranslation();
  return <ComingSoon title={t("sell.title")} message={t("sell.comingSoon")} />;
}

import React from "react";
import { useTranslation } from "react-i18next";
import { ComingSoon } from "../../../components/ComingSoon";

export function HomeScreen() {
  const { t } = useTranslation();
  return <ComingSoon title={t("home.title")} message={t("home.comingSoon")} />;
}

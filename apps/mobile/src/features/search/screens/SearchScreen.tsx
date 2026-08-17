import React from "react";
import { useTranslation } from "react-i18next";
import { ComingSoon } from "../../../components/ComingSoon";

export function SearchScreen() {
  const { t } = useTranslation();
  return <ComingSoon title={t("search.title")} message={t("search.comingSoon")} />;
}

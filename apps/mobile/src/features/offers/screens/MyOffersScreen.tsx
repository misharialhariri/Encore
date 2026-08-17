import React, { useCallback, useState } from "react";
import { Text } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { SharedListingRoutes } from "../../../navigation/types";
import { ScreenContainer } from "../../../components/ScreenContainer";
import { OfferListView } from "../components/OfferListView";
import * as offersApi from "../../../api/offers";
import { colors, spacing } from "../../../theme/colors";

type Props = NativeStackScreenProps<SharedListingRoutes & { MyOffers: undefined }, "MyOffers">;

export function MyOffersScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [offers, setOffers] = useState<offersApi.Offer[]>([]);

  useFocusEffect(
    useCallback(() => {
      offersApi.getMyOffers().then(setOffers);
    }, [])
  );

  return (
    <ScreenContainer scroll={false}>
      <Text style={{ fontSize: 22, fontWeight: "700", color: colors.ink, marginTop: spacing.sm }}>{t("offers.myOffersTitle")}</Text>
      <OfferListView offers={offers} emptyLabel={t("offers.empty")} onPress={(offer) => navigation.navigate("OfferThread", { offerId: offer.id })} />
    </ScreenContainer>
  );
}

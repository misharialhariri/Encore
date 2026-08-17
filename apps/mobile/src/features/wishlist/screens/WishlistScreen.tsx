import React, { useCallback, useState } from "react";
import { FlatList, StyleSheet, Text } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { SharedListingRoutes } from "../../../navigation/types";
import { ScreenContainer } from "../../../components/ScreenContainer";
import { Button } from "../../../components/Button";
import { ListingCardTile } from "../../listings/components/ListingCardTile";
import * as wishlistApi from "../../../api/wishlist";
import type { ListingCard } from "../../../api/search";
import { colors, spacing } from "../../../theme/colors";

type Props = NativeStackScreenProps<SharedListingRoutes & { Wishlist: undefined }, "Wishlist">;

export function WishlistScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [listings, setListings] = useState<ListingCard[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      wishlistApi
        .getWishlist()
        .then(setListings)
        .finally(() => setLoading(false));
    }, [])
  );

  return (
    <ScreenContainer scroll={false}>
      <Text style={styles.title}>{t("wishlist.title")}</Text>
      <FlatList
        data={listings}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.gridContent}
        ListEmptyComponent={
          !loading ? (
            <>
              <Text style={styles.empty}>{t("wishlist.empty")}</Text>
              <Button label={t("wishlist.emptyAction")} variant="ghost" onPress={() => navigation.getParent()?.navigate("Search" as never)} />
            </>
          ) : null
        }
        renderItem={({ item }) => (
          <ListingCardTile item={{ ...item, isWished: true }} width={165} onPress={() => navigation.navigate("ListingDetail", { listingId: item.id })} />
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: "700", color: colors.ink, marginTop: spacing.sm, marginBottom: spacing.md },
  gridContent: { paddingBottom: spacing.xl },
  gridRow: { gap: spacing.md },
  empty: { color: colors.muted, fontSize: 14, textAlign: "center", marginTop: spacing.xl },
});

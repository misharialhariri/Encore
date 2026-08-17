import React, { useCallback, useState } from "react";
import { Text } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { SellStackParamList } from "../../../navigation/types";
import { ScreenContainer } from "../../../components/ScreenContainer";
import { OrderListView } from "../components/OrderListView";
import * as ordersApi from "../../../api/orders";
import { colors, spacing } from "../../../theme/colors";

type Props = NativeStackScreenProps<SellStackParamList, "Sales">;

export function SalesScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<ordersApi.Order[]>([]);

  useFocusEffect(
    useCallback(() => {
      ordersApi.getSellingOrders().then(setOrders);
    }, [])
  );

  return (
    <ScreenContainer scroll={false}>
      <Text style={{ fontSize: 22, fontWeight: "700", color: colors.ink, marginTop: spacing.sm }}>{t("orders.salesTitle")}</Text>
      <OrderListView orders={orders} emptyLabel={t("orders.empty")} onPress={(order) => navigation.navigate("OrderDetail", { orderId: order.id })} />
    </ScreenContainer>
  );
}

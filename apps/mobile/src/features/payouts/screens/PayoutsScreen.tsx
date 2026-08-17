import React, { useCallback, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { ScreenContainer } from "../../../components/ScreenContainer";
import { TextField } from "../../../components/TextField";
import { Button } from "../../../components/Button";
import * as payoutsApi from "../../../api/payouts";
import { extractApiErrorMessage } from "../../../api/client";
import { colors, radius, spacing } from "../../../theme/colors";

const PAYOUT_STATUS_KEYS: Record<payoutsApi.Payout["status"], string> = {
  PENDING: "payouts.statusPending",
  PROCESSING: "payouts.statusProcessing",
  PAID: "payouts.statusPaid",
  FAILED: "payouts.statusFailed",
};

export function PayoutsScreen() {
  const { t } = useTranslation();
  const [bankAccount, setBankAccount] = useState<payoutsApi.BankAccount | null>(null);
  const [earnings, setEarnings] = useState<payoutsApi.Earnings | null>(null);
  const [payouts, setPayouts] = useState<payoutsApi.Payout[]>([]);

  const [iban, setIban] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [savingBank, setSavingBank] = useState(false);

  const [payoutAmount, setPayoutAmount] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    payoutsApi.getBankAccount().then((account) => {
      setBankAccount(account);
      if (account) {
        setIban(account.iban);
        setBankName(account.bankName);
        setAccountHolderName(account.accountHolderName);
      }
    });
    payoutsApi.getEarnings().then(setEarnings);
    payoutsApi.getPayouts().then(setPayouts);
  }, []);

  useFocusEffect(load);

  async function handleSaveBankAccount() {
    setSavingBank(true);
    setError(null);
    try {
      const account = await payoutsApi.saveBankAccount({ iban, bankName, accountHolderName });
      setBankAccount(account);
    } catch (err) {
      setError(extractApiErrorMessage(err, "Could not save bank account"));
    } finally {
      setSavingBank(false);
    }
  }

  async function handleRequestPayout() {
    const amount = Number(payoutAmount);
    if (!amount || amount <= 0) return;
    setRequesting(true);
    setError(null);
    try {
      await payoutsApi.requestPayout(amount);
      setPayoutAmount("");
      Alert.alert(t("payouts.requestPayout"));
      load();
    } catch (err) {
      setError(extractApiErrorMessage(err, "Could not request payout"));
    } finally {
      setRequesting(false);
    }
  }

  return (
    <ScreenContainer>
      <Text style={styles.title}>{t("payouts.title")}</Text>

      {earnings && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t("payouts.earningsTitle")}</Text>
          <SummaryRow label={t("payouts.totalEarned")} value={earnings.totalEarned} />
          <SummaryRow label={t("payouts.pendingPayouts")} value={earnings.pendingPayouts} />
          <SummaryRow label={t("payouts.totalPaidOut")} value={earnings.totalPaidOut} />
          <View style={styles.divider} />
          <SummaryRow label={t("payouts.availableBalance")} value={earnings.availableBalance} bold />
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t("payouts.bankAccountTitle")}</Text>
        <TextField label={t("payouts.ibanLabel")} placeholder={t("payouts.ibanPlaceholder")} value={iban} onChangeText={setIban} autoCapitalize="characters" />
        <TextField label={t("payouts.bankNameLabel")} value={bankName} onChangeText={setBankName} />
        <TextField label={t("payouts.accountHolderLabel")} value={accountHolderName} onChangeText={setAccountHolderName} />
        <Button label={t("payouts.saveBankAccount")} onPress={handleSaveBankAccount} loading={savingBank} style={styles.cardButton} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t("payouts.requestPayout")}</Text>
        <TextField label={t("payouts.amountLabel")} keyboardType="number-pad" value={payoutAmount} onChangeText={setPayoutAmount} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button label={t("payouts.requestPayout")} onPress={handleRequestPayout} loading={requesting} disabled={!bankAccount} style={styles.cardButton} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t("payouts.payoutHistory")}</Text>
        {payouts.length === 0 ? (
          <Text style={styles.empty}>{t("payouts.empty")}</Text>
        ) : (
          payouts.map((payout) => (
            <View key={payout.id} style={styles.payoutRow}>
              <Text style={styles.payoutAmount}>{payout.amount} SAR</Text>
              <Text style={styles.payoutStatus}>{t(PAYOUT_STATUS_KEYS[payout.status])}</Text>
            </View>
          ))
        )}
      </View>
    </ScreenContainer>
  );
}

function SummaryRow({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, bold && styles.summaryLabelBold]}>{label}</Text>
      <Text style={[styles.summaryValue, bold && styles.summaryValueBold]}>{value} SAR</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: "700", color: colors.ink, marginTop: spacing.sm, marginBottom: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  cardTitle: { fontSize: 15, fontWeight: "700", color: colors.ink, marginBottom: spacing.xs },
  cardButton: { marginTop: spacing.xs },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.xs },
  summaryLabel: { fontSize: 14, color: colors.inkSoft },
  summaryLabelBold: { fontWeight: "700", color: colors.ink },
  summaryValue: { fontSize: 14, color: colors.ink },
  summaryValueBold: { fontWeight: "700", color: colors.accent, fontSize: 16 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  error: { color: colors.danger, fontSize: 13 },
  empty: { color: colors.muted, fontSize: 13 },
  payoutRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.border },
  payoutAmount: { fontSize: 14, fontWeight: "600", color: colors.ink },
  payoutStatus: { fontSize: 13, color: colors.muted },
});

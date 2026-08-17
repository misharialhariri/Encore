import React, { useEffect, useState } from "react";
import { Modal, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { ChipGroup } from "../../../components/ChipGroup";
import { TextField } from "../../../components/TextField";
import { CitySelectField } from "../../../components/CitySelectField";
import { Button } from "../../../components/Button";
import * as catalogApi from "../../../api/catalog";
import type { SearchFilters } from "../../../api/search";
import type { City } from "../../../api/regions";
import { colors, radius, spacing } from "../../../theme/colors";

const CONDITION_KEYS: Record<string, string> = {
  NEW_WITH_TAGS: "listingForm.conditionNewWithTags",
  LIKE_NEW: "listingForm.conditionLikeNew",
  GOOD: "listingForm.conditionGood",
  FAIR: "listingForm.conditionFair",
};

const OCCASION_KEYS: Record<string, string> = {
  WEDDING_GUEST: "listingForm.occasionWeddingGuest",
  FORMAL: "listingForm.occasionFormal",
  SEMI_FORMAL: "listingForm.occasionSemiFormal",
  COCKTAIL: "listingForm.occasionCocktail",
};

export interface DraftFilters {
  sizes: string[];
  colors: string[];
  conditions: string[];
  occasionTypes: string[];
  brandIds: string[];
  priceMin: string;
  priceMax: string;
  city: City | null;
  shippingAvailable: boolean;
  acceptsOffers: boolean;
}

export const EMPTY_DRAFT_FILTERS: DraftFilters = {
  sizes: [],
  colors: [],
  conditions: [],
  occasionTypes: [],
  brandIds: [],
  priceMin: "",
  priceMax: "",
  city: null,
  shippingAvailable: false,
  acceptsOffers: false,
};

export function draftToSearchFilters(draft: DraftFilters): Partial<SearchFilters> {
  return {
    sizes: draft.sizes,
    colors: draft.colors,
    conditions: draft.conditions,
    occasionTypes: draft.occasionTypes,
    brandIds: draft.brandIds,
    priceMin: draft.priceMin ? Number(draft.priceMin) : undefined,
    priceMax: draft.priceMax ? Number(draft.priceMax) : undefined,
    cityId: draft.city?.id,
    shippingAvailable: draft.shippingAvailable || undefined,
    acceptsOffers: draft.acceptsOffers || undefined,
  };
}

interface FilterSheetProps {
  visible: boolean;
  onClose: () => void;
  value: DraftFilters;
  onApply: (next: DraftFilters) => void;
}

export function FilterSheet({ visible, onClose, value, onApply }: FilterSheetProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<DraftFilters>(value);
  const [meta, setMeta] = useState<catalogApi.ListingMeta | null>(null);
  const [brands, setBrands] = useState<catalogApi.Brand[]>([]);

  useEffect(() => {
    if (!visible) return;
    setDraft(value);
    if (!meta) catalogApi.getListingMeta().then(setMeta);
    if (brands.length === 0) catalogApi.searchBrands().then(setBrands);
  }, [visible]);

  if (!meta) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>{t("search.filters")}</Text>

            <Field label={t("search.priceRange")}>
              <View style={styles.priceRow}>
                <TextField
                  placeholder={t("search.priceMin")}
                  keyboardType="number-pad"
                  value={draft.priceMin}
                  onChangeText={(v) => setDraft((d) => ({ ...d, priceMin: v }))}
                  style={styles.priceInput}
                />
                <TextField
                  placeholder={t("search.priceMax")}
                  keyboardType="number-pad"
                  value={draft.priceMax}
                  onChangeText={(v) => setDraft((d) => ({ ...d, priceMax: v }))}
                  style={styles.priceInput}
                />
              </View>
            </Field>

            <Field label={t("listingForm.sizeLabel")}>
              <ChipGroup
                options={meta.sizeChart.map((row) => ({ value: row.gulf, label: row.gulf }))}
                selected={draft.sizes}
                onChange={(sizes) => setDraft((d) => ({ ...d, sizes }))}
                multiple
              />
            </Field>

            <Field label={t("listingForm.colorLabel")}>
              <ChipGroup
                options={meta.colors.map((c) => ({ value: c, label: c }))}
                selected={draft.colors}
                onChange={(colors) => setDraft((d) => ({ ...d, colors }))}
                multiple
              />
            </Field>

            <Field label={t("listingForm.conditionLabel")}>
              <ChipGroup
                options={meta.conditions.map((c) => ({ value: c, label: t(CONDITION_KEYS[c]) }))}
                selected={draft.conditions}
                onChange={(conditions) => setDraft((d) => ({ ...d, conditions }))}
                multiple
              />
            </Field>

            <Field label={t("listingForm.occasionLabel")}>
              <ChipGroup
                options={meta.occasionTypes.map((o) => ({ value: o, label: t(OCCASION_KEYS[o]) }))}
                selected={draft.occasionTypes}
                onChange={(occasionTypes) => setDraft((d) => ({ ...d, occasionTypes }))}
                multiple
              />
            </Field>

            {brands.length > 0 && (
              <Field label={t("listingForm.brandLabel")}>
                <ChipGroup
                  options={brands.map((b) => ({ value: b.id, label: b.nameEn }))}
                  selected={draft.brandIds}
                  onChange={(brandIds) => setDraft((d) => ({ ...d, brandIds }))}
                  multiple
                />
              </Field>
            )}

            <CitySelectField
              label={t("listingForm.pickupCityLabel")}
              placeholder={t("listingForm.pickupCityLabel")}
              value={draft.city}
              onChange={(city) => setDraft((d) => ({ ...d, city }))}
              cancelLabel={t("common.cancel")}
            />

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>{t("listingForm.shippingLabel")}</Text>
              <Switch
                value={draft.shippingAvailable}
                onValueChange={(v) => setDraft((d) => ({ ...d, shippingAvailable: v }))}
              />
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>{t("listingForm.offersLabel")}</Text>
              <Switch value={draft.acceptsOffers} onValueChange={(v) => setDraft((d) => ({ ...d, acceptsOffers: v }))} />
            </View>

            <View style={styles.actionsRow}>
              <Button
                label={t("search.clearFilters")}
                variant="secondary"
                onPress={() => setDraft(EMPTY_DRAFT_FILTERS)}
                style={styles.actionButton}
              />
              <Button
                label={t("search.applyFilters")}
                onPress={() => {
                  onApply(draft);
                  onClose();
                }}
                style={styles.actionButton}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.paper,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    maxHeight: "88%",
  },
  title: { fontSize: 18, fontWeight: "700", color: colors.ink, marginBottom: spacing.md },
  field: { marginBottom: spacing.md },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: colors.inkSoft, marginBottom: spacing.xs },
  priceRow: { flexDirection: "row", gap: spacing.sm },
  priceInput: { flex: 1 },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
  },
  switchLabel: { fontSize: 15, color: colors.ink },
  actionsRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md, marginBottom: spacing.lg },
  actionButton: { flex: 1 },
});

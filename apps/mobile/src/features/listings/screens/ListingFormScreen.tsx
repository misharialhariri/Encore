import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, Switch, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { SellStackParamList } from "../../../navigation/types";
import { ScreenContainer } from "../../../components/ScreenContainer";
import { TextField } from "../../../components/TextField";
import { Button } from "../../../components/Button";
import { ChipGroup } from "../../../components/ChipGroup";
import { CitySelectField } from "../../../components/CitySelectField";
import { BrandAutocomplete } from "../components/BrandAutocomplete";
import { PhotoGridPicker } from "../components/PhotoGridPicker";
import type { City } from "../../../api/regions";
import * as catalogApi from "../../../api/catalog";
import * as listingsApi from "../../../api/listings";
import { extractApiErrorMessage } from "../../../api/client";
import { colors, spacing } from "../../../theme/colors";

type Props = NativeStackScreenProps<SellStackParamList, "ListingForm">;

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

export function ListingFormScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const listingId = route.params?.listingId;
  const isEdit = Boolean(listingId);

  const [meta, setMeta] = useState<catalogApi.ListingMeta | null>(null);
  const [styleTags, setStyleTags] = useState<catalogApi.StyleTag[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [photos, setPhotos] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [brand, setBrand] = useState<{ id: string; nameEn: string } | null>(null);
  const [sizeGulf, setSizeGulf] = useState<string | null>(null);
  const [colors_, setColors] = useState<string[]>([]);
  const [condition, setCondition] = useState<string | null>(null);
  const [originalPrice, setOriginalPrice] = useState("");
  const [askingPrice, setAskingPrice] = useState("");
  const [occasionType, setOccasionType] = useState<string | null>(null);
  const [selectedStyleTagIds, setSelectedStyleTagIds] = useState<string[]>([]);
  const [fabricType, setFabricType] = useState("");
  const [description, setDescription] = useState("");
  const [pickupCity, setPickupCity] = useState<City | null>(null);
  const [pickupDistrict, setPickupDistrict] = useState("");
  const [shippingAvailable, setShippingAvailable] = useState(false);
  const [acceptsOffers, setAcceptsOffers] = useState(false);

  useEffect(() => {
    Promise.all([catalogApi.getListingMeta(), catalogApi.getStyleTags()])
      .then(([m, tags]) => {
        setMeta(m);
        setStyleTags(tags);
      })
      .catch(() => setError("Could not load form data"));
  }, []);

  useEffect(() => {
    if (!listingId) return;
    listingsApi
      .getListing(listingId)
      .then((listing) => {
        setPhotos(listing.images.map((img) => img.url));
        setTitle(listing.title);
        setBrand(listing.brand ? { id: listing.brand.id, nameEn: listing.brand.nameEn } : null);
        setSizeGulf(listing.sizeGulf);
        setColors(listing.colors);
        setCondition(listing.condition);
        setOriginalPrice(String(listing.originalPrice));
        setAskingPrice(String(listing.askingPrice));
        setOccasionType(listing.occasionType);
        setSelectedStyleTagIds(listing.styleTags.map((tag) => tag.id));
        setFabricType(listing.fabricType);
        setDescription(listing.description);
        setPickupCity({
          id: listing.pickupCity.id,
          nameEn: listing.pickupCity.nameEn,
          nameAr: listing.pickupCity.nameAr,
          regionId: "",
        });
        setPickupDistrict(listing.pickupDistrict);
        setShippingAvailable(listing.shippingAvailable);
        setAcceptsOffers(listing.acceptsOffers);
      })
      .catch(() => setError("Could not load listing"))
      .finally(() => setLoading(false));
  }, [listingId]);

  const sizeRow = meta?.sizeChart.find((row) => row.gulf === sizeGulf);

  async function handleSubmit() {
    if (photos.length === 0) {
      setError(t("listingForm.photosLabel"));
      return;
    }
    if (title.trim().length < 3 || !brand || !sizeGulf || colors_.length === 0 || !condition) {
      setError(t("listingForm.titleLabel"));
      return;
    }
    const original = Number(originalPrice);
    const asking = Number(askingPrice);
    if (!original || !asking || !occasionType || selectedStyleTagIds.length === 0 || !fabricType.trim()) {
      setError(t("listingForm.askingPriceLabel"));
      return;
    }
    if (!pickupCity || !pickupDistrict.trim()) {
      setError(t("listingForm.pickupCityLabel"));
      return;
    }

    const payload: listingsApi.CreateListingInput = {
      title: title.trim(),
      brandId: brand.id,
      sizeGulf,
      colors: colors_,
      condition: condition as listingsApi.ListingCondition,
      originalPrice: original,
      askingPrice: asking,
      occasionType: occasionType as listingsApi.OccasionType,
      styleTagIds: selectedStyleTagIds,
      fabricType: fabricType.trim(),
      description: description.trim(),
      pickupCityId: pickupCity.id,
      pickupDistrict: pickupDistrict.trim(),
      shippingAvailable,
      acceptsOffers,
      imageUrls: photos,
    };

    setSaving(true);
    setError(null);
    try {
      const result = isEdit ? await listingsApi.updateListing(listingId!, payload) : await listingsApi.createListing(payload);
      if (result.status === "PENDING_REVIEW") {
        Alert.alert(t("listingForm.pendingReviewNotice"));
      }
      navigation.navigate("Dashboard");
    } catch (err) {
      setError(extractApiErrorMessage(err, "Could not save listing"));
    } finally {
      setSaving(false);
    }
  }

  if (loading || !meta) {
    return <ScreenContainer scroll={false} />;
  }

  return (
    <ScreenContainer>
      <Text style={styles.title}>{isEdit ? t("listingForm.editTitle") : t("listingForm.createTitle")}</Text>

      <Field label={t("listingForm.photosLabel", { count: photos.length, max: meta.maxPhotosPerListing })}>
        <PhotoGridPicker
          photoUrls={photos}
          onChange={setPhotos}
          max={meta.maxPhotosPerListing}
          addLabel={t("listingForm.addPhoto")}
        />
      </Field>

      <TextField label={t("listingForm.titleLabel")} placeholder={t("listingForm.titlePlaceholder")} value={title} onChangeText={setTitle} />

      <Field label={t("listingForm.brandLabel")}>
        <BrandAutocomplete label="" placeholder={t("listingForm.brandPlaceholder")} value={brand} onChange={setBrand} />
      </Field>

      <Field label={t("listingForm.sizeLabel")}>
        <ChipGroup
          options={meta.sizeChart.map((row) => ({ value: row.gulf, label: row.gulf }))}
          selected={sizeGulf ? [sizeGulf] : []}
          onChange={([v]) => setSizeGulf(v ?? null)}
        />
        {sizeRow && (
          <Text style={styles.hint}>
            {t("listingForm.sizeHint", { eu: sizeRow.eu, us: sizeRow.us, uk: sizeRow.uk })}
          </Text>
        )}
      </Field>

      <Field label={t("listingForm.colorLabel")}>
        <ChipGroup
          options={meta.colors.map((c) => ({ value: c, label: c }))}
          selected={colors_}
          onChange={setColors}
          multiple
          max={5}
        />
      </Field>

      <Field label={t("listingForm.conditionLabel")}>
        <ChipGroup
          options={meta.conditions.map((c) => ({ value: c, label: t(CONDITION_KEYS[c]) }))}
          selected={condition ? [condition] : []}
          onChange={([v]) => setCondition(v ?? null)}
        />
      </Field>

      <View style={styles.priceRow}>
        <View style={styles.priceField}>
          <TextField
            label={t("listingForm.originalPriceLabel")}
            keyboardType="number-pad"
            value={originalPrice}
            onChangeText={setOriginalPrice}
          />
        </View>
        <View style={styles.priceField}>
          <TextField
            label={t("listingForm.askingPriceLabel")}
            keyboardType="number-pad"
            value={askingPrice}
            onChangeText={setAskingPrice}
          />
        </View>
      </View>

      <Field label={t("listingForm.occasionLabel")}>
        <ChipGroup
          options={meta.occasionTypes.map((o) => ({ value: o, label: t(OCCASION_KEYS[o]) }))}
          selected={occasionType ? [occasionType] : []}
          onChange={([v]) => setOccasionType(v ?? null)}
        />
      </Field>

      <Field label={t("listingForm.styleTagsLabel")}>
        <ChipGroup
          options={styleTags.map((tag) => ({ value: tag.id, label: tag.nameEn }))}
          selected={selectedStyleTagIds}
          onChange={setSelectedStyleTagIds}
          multiple
          max={6}
        />
      </Field>

      <TextField label={t("listingForm.fabricLabel")} placeholder={t("listingForm.fabricPlaceholder")} value={fabricType} onChangeText={setFabricType} />

      <TextField
        label={t("listingForm.descriptionLabel")}
        value={description}
        onChangeText={(text) => setDescription(text.slice(0, 500))}
        multiline
        numberOfLines={4}
        style={styles.textArea}
      />
      <Text style={styles.hint}>{t("listingForm.descriptionHint", { count: description.length })}</Text>

      <CitySelectField
        label={t("listingForm.pickupCityLabel")}
        placeholder={t("listingForm.pickupCityLabel")}
        value={pickupCity}
        onChange={setPickupCity}
        cancelLabel={t("common.cancel")}
      />

      <TextField
        label={t("listingForm.pickupDistrictLabel")}
        placeholder={t("listingForm.pickupDistrictPlaceholder")}
        value={pickupDistrict}
        onChangeText={setPickupDistrict}
      />

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>{t("listingForm.shippingLabel")}</Text>
        <Switch value={shippingAvailable} onValueChange={setShippingAvailable} />
      </View>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>{t("listingForm.offersLabel")}</Text>
        <Switch value={acceptsOffers} onValueChange={setAcceptsOffers} />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        label={isEdit ? t("listingForm.saveChanges") : t("listingForm.publish")}
        onPress={handleSubmit}
        loading={saving}
        style={styles.submitButton}
      />
    </ScreenContainer>
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
  title: { fontSize: 22, fontWeight: "700", color: colors.ink, marginTop: spacing.sm, marginBottom: spacing.lg },
  field: { marginBottom: spacing.md },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: colors.inkSoft, marginBottom: spacing.xs },
  hint: { fontSize: 12, color: colors.muted, marginTop: spacing.xs },
  priceRow: { flexDirection: "row", gap: spacing.sm },
  priceField: { flex: 1 },
  textArea: { minHeight: 90, textAlignVertical: "top", paddingTop: spacing.sm },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
  },
  switchLabel: { fontSize: 15, color: colors.ink },
  error: { color: colors.danger, fontSize: 13, marginTop: spacing.sm },
  submitButton: { marginTop: spacing.lg, marginBottom: spacing.xl },
});

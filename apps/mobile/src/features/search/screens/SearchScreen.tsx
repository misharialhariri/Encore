import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { SharedListingRoutes } from "../../../navigation/types";
import { ScreenContainer } from "../../../components/ScreenContainer";
import { TextField } from "../../../components/TextField";
import { ChipGroup } from "../../../components/ChipGroup";
import { ListingCardTile } from "../../listings/components/ListingCardTile";
import { FilterSheet, EMPTY_DRAFT_FILTERS, draftToSearchFilters, type DraftFilters } from "../components/FilterSheet";
import * as searchApi from "../../../api/search";
import type { ListingCard, SortOption } from "../../../api/search";
import { getRecentSearches, addRecentSearch, clearRecentSearches } from "../../../utils/recentSearches";
import { colors, radius, spacing } from "../../../theme/colors";

type Props = NativeStackScreenProps<SharedListingRoutes & { SearchResults: undefined }, "SearchResults">;

const SORT_OPTIONS: { value: SortOption; labelKey: string }[] = [
  { value: "newest", labelKey: "search.sortNewest" },
  { value: "popular", labelKey: "search.sortPopular" },
  { value: "price_asc", labelKey: "search.sortPriceAsc" },
  { value: "price_desc", labelKey: "search.sortPriceDesc" },
  { value: "nearest", labelKey: "search.sortNearest" },
];

export function SearchScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [filters, setFilters] = useState<DraftFilters>(EMPTY_DRAFT_FILTERS);
  const [sort, setSort] = useState<SortOption>("newest");
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const [results, setResults] = useState<ListingCard[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const activeFilterCount =
    filters.sizes.length +
    filters.colors.length +
    filters.conditions.length +
    filters.occasionTypes.length +
    filters.brandIds.length +
    (filters.priceMin ? 1 : 0) +
    (filters.priceMax ? 1 : 0) +
    (filters.city ? 1 : 0) +
    (filters.shippingAvailable ? 1 : 0) +
    (filters.acceptsOffers ? 1 : 0);

  useEffect(() => {
    getRecentSearches().then(setRecentSearches);
    void runSearch(1, "", filters, sort);
  }, []);

  useEffect(() => {
    if (query.trim().length === 0) {
      setSuggestions([]);
      return;
    }
    const handle = setTimeout(() => {
      searchApi
        .getSearchSuggestions(query.trim())
        .then(setSuggestions)
        .catch(() => setSuggestions([]));
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  async function runSearch(nextPage: number, q: string, f: DraftFilters, s: SortOption) {
    if (nextPage === 1) setLoading(true);
    else setLoadingMore(true);
    try {
      const result = await searchApi.searchListings({
        q: q || undefined,
        ...draftToSearchFilters(f),
        sort: s,
        page: nextPage,
        limit: 20,
      });
      setResults((prev) => (nextPage === 1 ? result.listings : [...prev, ...result.listings]));
      setTotal(result.total);
      setPage(result.page);
      setHasMore(result.hasMore);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  async function handleSubmit(q: string) {
    setShowSuggestions(false);
    setSubmittedQuery(q);
    setQuery(q);
    const next = await addRecentSearch(q);
    setRecentSearches(next);
    void runSearch(1, q, filters, sort);
  }

  function handleApplyFilters(next: DraftFilters) {
    setFilters(next);
    void runSearch(1, submittedQuery, next, sort);
  }

  function handleSortChange(next: SortOption) {
    setSort(next);
    void runSearch(1, submittedQuery, filters, next);
  }

  function handleClearRecent() {
    void clearRecentSearches();
    setRecentSearches([]);
  }

  return (
    <ScreenContainer scroll={false}>
      <View style={styles.searchRow}>
        <TextField
          placeholder={t("search.placeholder")}
          value={query}
          onChangeText={(text) => {
            setQuery(text);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onSubmitEditing={() => handleSubmit(query)}
          returnKeyType="search"
          style={styles.searchInput}
        />
        <Pressable style={styles.filterButton} onPress={() => setFilterSheetOpen(true)}>
          <Ionicons name="options-outline" size={20} color={colors.ink} />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {showSuggestions && query.trim().length > 0 && suggestions.length > 0 ? (
        <View style={styles.suggestionsBox}>
          {suggestions.map((s) => (
            <Pressable key={s} style={styles.suggestionRow} onPress={() => handleSubmit(s)}>
              <Ionicons name="search-outline" size={16} color={colors.muted} />
              <Text style={styles.suggestionText}>{s}</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <>
          {recentSearches.length > 0 && !submittedQuery && (
            <View style={styles.recentSection}>
              <View style={styles.recentHeader}>
                <Text style={styles.recentTitle}>{t("search.recentSearches")}</Text>
                <Text style={styles.recentClear} onPress={handleClearRecent}>
                  {t("search.clearRecent")}
                </Text>
              </View>
              <ChipGroup
                options={recentSearches.map((s) => ({ value: s, label: s }))}
                selected={[]}
                onChange={([v]) => v && handleSubmit(v)}
                multiple
              />
            </View>
          )}

          <View style={styles.sortRow}>
            <ChipGroup
              options={SORT_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey) }))}
              selected={[sort]}
              onChange={([v]) => v && handleSortChange(v as SortOption)}
            />
          </View>

          {!loading && (
            <Text style={styles.resultsCount}>{t("search.resultsCount", { count: total })}</Text>
          )}

          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={styles.gridContent}
            showsVerticalScrollIndicator={false}
            onEndReachedThreshold={0.4}
            onEndReached={() => {
              if (hasMore && !loadingMore) void runSearch(page + 1, submittedQuery, filters, sort);
            }}
            ListEmptyComponent={
              loading ? (
                <ActivityIndicator style={styles.loader} color={colors.accent} />
              ) : (
                <Text style={styles.empty}>{t("search.noResults")}</Text>
              )
            }
            ListFooterComponent={loadingMore ? <ActivityIndicator style={styles.loader} color={colors.accent} /> : null}
            renderItem={({ item }) => (
              <ListingCardTile
                item={item}
                width={165}
                onPress={() => navigation.navigate("ListingDetail", { listingId: item.id })}
              />
            )}
          />
        </>
      )}

      <FilterSheet visible={filterSheetOpen} onClose={() => setFilterSheetOpen(false)} value={filters} onApply={handleApplyFilters} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  searchRow: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start", marginTop: spacing.sm },
  searchInput: { flex: 1 },
  filterButton: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  filterBadgeText: { color: colors.white, fontSize: 10, fontWeight: "700" },
  suggestionsBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    marginTop: spacing.sm,
  },
  suggestionRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md },
  suggestionText: { fontSize: 14, color: colors.ink },
  recentSection: { marginTop: spacing.md },
  recentHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.sm },
  recentTitle: { fontSize: 13, fontWeight: "600", color: colors.inkSoft },
  recentClear: { fontSize: 13, color: colors.accent },
  sortRow: { marginTop: spacing.md },
  resultsCount: { fontSize: 12, color: colors.muted, marginTop: spacing.sm, marginBottom: spacing.xs },
  gridContent: { paddingTop: spacing.sm, paddingBottom: spacing.xl },
  gridRow: { gap: spacing.md },
  loader: { marginTop: spacing.xl },
  empty: { color: colors.muted, fontSize: 14, textAlign: "center", marginTop: spacing.xl },
});

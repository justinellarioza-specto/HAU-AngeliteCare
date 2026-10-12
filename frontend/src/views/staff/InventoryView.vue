<script setup lang="ts">
import { ref, watch } from "vue";
import { api, fmtDate, type InventoryItem } from "@/api";
import ItemModal from "@/components/staff/ItemModal.vue";
import LoadRow from "@/components/ui/LoadRow.vue";
import PagerBar from "@/components/ui/PagerBar.vue";
import SearchBox from "@/components/ui/SearchBox.vue";
import { useApi, useDebounced } from "@/composables/useApi";
import { refresh, staffUi } from "@/stores/staffUi";

const search = ref("");
const category = ref("");
const stock = ref("");
const page = ref(1);
const selected = ref<string | null>(null);
const q = useDebounced(search);
watch([q, category, stock], () => { page.value = 1; });

const { data, error, loading } = useApi(
  () => api.inventory({ search: q.value, category: category.value, stock: stock.value, page: page.value, limit: 25 }),
  [q, category, stock, page, () => staffUi.refreshKey],
);

function stockLabel(item: InventoryItem): [string, string] {
  if (item.availableQuantity === 0) return ["Out of stock", "status-critical"];
  if (item.availableQuantity <= item.reorderLevel / 2) return ["Critical", "status-critical"];
  if (item.isLowStock) return ["Low", "status-low"];
  return ["Sufficient", "status-sufficient"];
}
</script>

<template>
  <section class="panel module-panel">
    <div class="module-toolbar">
      <SearchBox v-model="search" placeholder="Search medicine or supply…" />
      <div class="toolbar-filters">
        <select v-model="category" aria-label="Category">
          <option value="">All categories</option><option value="medicine">Medicine</option><option value="supply">Supply</option><option value="equipment">Equipment</option>
        </select>
        <select v-model="stock" aria-label="Stock status">
          <option value="">All stock levels</option><option value="low">Low stock</option><option value="out">Out of stock</option><option value="expiring">Expiring soon</option><option value="expired">Has expired stock</option>
        </select>
      </div>
      <span>{{ data?.pagination.total ?? 0 }} items</span>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Item</th><th>Category</th><th>Available</th><th>Reorder at</th><th>Nearest expiry</th><th>Status</th><th /></tr></thead>
        <tbody>
          <tr v-for="item in data?.data ?? []" :key="item._id">
            <td><strong>{{ item.name }}</strong><br /><small>{{ [item.brandName, item.dosageForm].filter(Boolean).join(" · ") }}</small></td>
            <td class="capitalize">{{ item.category }}</td>
            <td>{{ item.availableQuantity }} {{ item.unit }}<template v-if="item.expiredQuantity > 0"><br /><small class="error-text">{{ item.expiredQuantity }} expired</small></template></td>
            <td>{{ item.reorderLevel }} {{ item.unit }}</td>
            <td>{{ fmtDate(item.nearestExpiration) }}<template v-if="item.stockStatus?.expiring"><br /><small class="warn-text">Expiring soon</small></template></td>
            <td><span :class="['status-indicator', stockLabel(item)[1]]">{{ stockLabel(item)[0] }}</span></td>
            <td>
              <div class="row-actions">
                <button class="row-action" type="button" @click="staffUi.restockId = item._id">Restock</button>
                <button class="row-action muted" type="button" @click="selected = item._id">Details</button>
              </div>
            </td>
          </tr>
          <LoadRow :colspan="7" :empty="!data?.data.length" empty-text="No matching items." :error="error" :loading="loading" />
        </tbody>
      </table>
    </div>
    <PagerBar v-if="data" :page="data.pagination.page" :total="data.pagination.total" :total-pages="data.pagination.totalPages" @page="page = $event" />
    <ItemModal v-if="selected" :item-id="selected" @changed="refresh" @close="selected = null" />
  </section>
</template>

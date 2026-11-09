<template>
  <div class="products-page container my-4">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h2>Products</h2>
      <div>
        <button class="btn btn-primary me-2" @click="openAddModal">Add Product</button>
      </div>
    </div>

    <input
      v-model="searchQuery"
      placeholder="Search products..."
      class="form-control mb-3"
    />

    <table class="table table-hover">
      <thead>
        <tr>
          <th>Name</th>
          <th>Recipe</th>
          <th>Serving Size (g)</th>
          <th>Servings / Pack</th>
          <th>Net Weight (g)</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="product in filteredProducts" :key="product.id">
          <td>{{ product.name }}</td>
          <td>{{ product.recipe?.name || "—" }}</td>
          <td>{{ product.servingSize }}</td>
          <td>{{ product.servingsPerPack }}</td>
          <td>{{ packWeight(product) }}</td>
          <td>
            <button class="btn btn-sm btn-outline-secondary me-1" @click="editProduct(product)">Edit</button>
            <button class="btn btn-sm btn-outline-danger" @click="deleteProduct(product.id)">Delete</button>
            <button class="btn btn-sm btn-outline-secondary">Export</button>
          </td>
        </tr>
      </tbody>
    </table>

    <ProductModal
      v-if="showModal"
      :product="editingProduct"
      @close="closeModal"
      @save="saveProduct"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useProductStore } from "../stores/productStore";
import type { Product } from "../config/types";
import ProductModal from "../components/ProductModal.vue";

const productStore = useProductStore();

const searchQuery = ref("");
const showModal = ref(false);
const editingProduct = ref<Product | null>(null);

const filteredProducts = computed(() =>
  productStore.products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
);

const openAddModal = () => {
  editingProduct.value = null;
  showModal.value = true;
};

const editProduct = (product: Product) => {
  editingProduct.value = { ...product };
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  editingProduct.value = null;
};

const saveProduct = (product: Product) => {
  if (product.id && productStore.getProductById(product.id)) {
    productStore.updateProduct(product);
  } else {
    const { id, ...newProduct } = product;
    productStore.addProduct(newProduct);
  }
  closeModal();
};

const deleteProduct = (id: number) => {
  if (confirm("Are you sure you want to delete this product?")) {
    productStore.removeProduct(id);
  }
};

function packWeight(product: Product) {
    return product.servingSize * product.servingsPerPack;
}
</script>
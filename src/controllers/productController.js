import { parseOrThrow } from '../utils/validation.js';
import {
  createProductSchema,
  updateProductSchema,
  reorderSchema,
} from '../validators/schemas.js';
import * as products from '../services/productService.js';
import { badRequest } from '../utils/errors.js';

export async function listPublic(_req, res) {
  const items = await products.listActiveProducts();
  res.json({ products: items.map((p) => products.serializeProduct(p)) });
}

export async function getPublic(req, res) {
  const product = await products.getProduct(req.params.id, { onlyActive: true });
  res.json({ product: products.serializeProduct(product) });
}

export async function listAdmin(_req, res) {
  const items = await products.listAllProducts();
  res.json({ products: items.map((p) => products.serializeProduct(p, { admin: true })) });
}

export async function getAdmin(req, res) {
  const product = await products.getProduct(req.params.id);
  res.json({ product: products.serializeProduct(product, { admin: true }) });
}

export async function create(req, res) {
  const data = parseOrThrow(createProductSchema, req.body);
  const product = await products.createProduct(data);
  res.status(201).json({ product: products.serializeProduct(product, { admin: true }) });
}

export async function update(req, res) {
  const data = parseOrThrow(updateProductSchema, req.body);
  const product = await products.updateProduct(req.params.id, data);
  res.json({ product: products.serializeProduct(product, { admin: true }) });
}

export async function remove(req, res) {
  // Protección contra borrados accidentales: el cliente debe enviar la palabra de confirmación
  if (req.query.confirm !== 'ELIMINAR') {
    throw badRequest('Confirmación requerida para eliminar el producto');
  }
  await products.deleteProduct(req.params.id);
  res.json({ ok: true });
}

export async function reorder(req, res) {
  const { ids } = parseOrThrow(reorderSchema, req.body);
  await products.reorderProducts(ids);
  res.json({ ok: true });
}

export async function stats(_req, res) {
  res.json({ stats: await products.productStats() });
}

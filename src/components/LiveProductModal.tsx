import { useRef, useState } from 'react';
import { Check, CloudUpload, ImagePlus, X } from 'lucide-react';

type ProductDraft = {
  id?: string;
  name: string;
  description: string;
  price: number;
  discount_price: number | null;
  original_price: number | null;
  category: string;
  category_id?: string | null;
  image_url: string;
  images: string[];
  colors: string[];
  tags: string[];
  stock: number;
  featured: boolean;
  cost_price: number;
  published?: boolean;
  image_file?: File;
  image_files?: File[];
};

type CategoryOption = { id: string; name: string };
type TagOption = { id: string; name: string; active: boolean };

type GalleryItem = { url: string; file?: File };

export function LiveProductModal({
  initial,
  categories,
  tags,
  onClose,
  onSave,
}: {
  initial: ProductDraft;
  categories: CategoryOption[];
  tags: TagOption[];
  onClose: () => void;
  onSave: (draft: ProductDraft) => void;
}) {
  const [form, setForm] = useState<ProductDraft>(initial);
  const [mainPreview, setMainPreview] = useState(initial.image_url || '');
  const [gallery, setGallery] = useState<GalleryItem[]>(() =>
    (initial.images || [])
      .filter((image) => image && image !== initial.image_url && !image.startsWith('blob:'))
      .slice(0, 8)
      .map((url) => ({ url }))
  );
  const mainInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);

  const chooseMain = (file?: File) => {
    if (!file || !file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) return;
    const url = URL.createObjectURL(file);
    setMainPreview(url);
    setForm((current) => ({ ...current, image_url: url, image_file: file }));
  };

  const chooseGallery = (files?: FileList | null) => {
    if (!files) return;
    const slots = Math.max(0, 8 - gallery.length);
    const selected = Array.from(files)
      .filter((file) => file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024)
      .slice(0, slots);
    if (!selected.length) return;
    setGallery((current) => [
      ...current,
      ...selected.map((file) => ({ url: URL.createObjectURL(file), file })),
    ].slice(0, 8));
    if (galleryInput.current) galleryInput.current.value = '';
  };

  const submit = () => {
    const originalPrice = Number(form.original_price ?? form.price ?? 0);
    const sellingPrice = Number(form.discount_price ?? form.price ?? 0);
    onSave({
      ...form,
      price: originalPrice,
      original_price: originalPrice,
      discount_price: sellingPrice < originalPrice ? sellingPrice : null,
      images: gallery.filter((item) => !item.file).map((item) => item.url),
      image_files: gallery.filter((item) => item.file).map((item) => item.file as File),
    });
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-head"><h2>{initial.id ? 'Edit product' : 'Add product'}</h2><button className="icon-button" onClick={onClose}><X size={18} /></button></div>
        <div className="modal-grid">
          <label>Product name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Cloud 3-Seater Sofa" /></label>
          <label>Category<select value={form.category} onChange={(event) => { const category = categories.find((item) => item.name === event.target.value); setForm({ ...form, category: event.target.value, category_id: category?.id || null }); }}>{categories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}</select></label>
          <label>Original price (Rs.)<input type="number" min="0" value={form.original_price ?? form.price ?? 0} onChange={(event) => { const value = Number(event.target.value); setForm({ ...form, price: value, original_price: value }); }} /><small className="field-help">The crossed-out price shown before a sale.</small></label>
          <label>Discount / selling price (Rs.)<input type="number" min="0" value={form.discount_price ?? form.price ?? 0} onChange={(event) => { const value = Number(event.target.value); setForm({ ...form, discount_price: Number.isFinite(value) ? value : null }); }} /><small className="field-help">The current price customers pay.</small></label>
          <label>Cost price<input type="number" value={form.cost_price || 0} onChange={(event) => setForm({ ...form, cost_price: Number(event.target.value) })} /></label>
          <label>Stock units<input type="number" value={form.stock || 0} onChange={(event) => setForm({ ...form, stock: Number(event.target.value) })} /></label>
          <label>Color options<input value={form.colors?.join(', ') || ''} onChange={(event) => setForm({ ...form, colors: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} placeholder="Beige, Charcoal" /></label>
          <fieldset className="tag-picker"><legend>Tags</legend><div className="tag-picker-options">{tags.filter((tag) => tag.active).map((tag) => { const selected = (form.tags || []).includes(tag.name); return <label className={`tag-choice ${selected ? 'selected' : ''}`} key={tag.id}><input type="checkbox" checked={selected} onChange={() => setForm((current) => ({ ...current, tags: selected ? (current.tags || []).filter((name) => name !== tag.name) : [...(current.tags || []), tag.name] }))} /><span>{tag.name}</span></label>; })}{!tags.some((tag) => tag.active) && <small className="field-help">Add an active tag from Tag List first.</small>}</div><small className="field-help">Select one or more tags for this product.</small></fieldset>
        </div>
        <label>Description<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Describe materials, dimensions and care..." /></label>
        <section className="product-image-section">
          <div className="image-section-heading"><div><b>Main Product Image</b><small>This one image appears on the storefront product card.</small></div></div>
          <div className="dropzone" onClick={() => mainInput.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); chooseMain(event.dataTransfer.files[0]); }}>
            {mainPreview ? <img src={mainPreview} alt="Main product preview" /> : <><CloudUpload size={29} /><b>Drop main image here</b><span>or click to browse · JPG, PNG or WebP up to 10MB</span></>}
            <input ref={mainInput} type="file" accept="image/*" hidden onChange={(event) => chooseMain(event.target.files?.[0])} />
          </div>
        </section>
        <section className="product-image-section additional-images-section">
          <div className="image-section-heading"><div><b>Additional Product Images</b><small>These are separate from the Main Image and appear in the product popup gallery.</small></div><strong>{gallery.length}/8</strong></div>
          <div className="dropzone additional-image-dropzone" onClick={() => galleryInput.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); chooseGallery(event.dataTransfer.files); }}>
            <ImagePlus size={25} /><b>Add additional images</b><span>Select or drop up to 8 extra images</span><input ref={galleryInput} type="file" multiple accept="image/*" hidden onChange={(event) => chooseGallery(event.target.files)} />
          </div>
          {gallery.length > 0 && <div className="additional-image-previews">{gallery.map((item, index) => <div className="additional-image-preview" key={`${item.url}-${index}`}><img src={item.url} alt={`Additional product image ${index + 1}`} /><button type="button" onClick={() => setGallery((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove additional image ${index + 1}`}><X size={13} /></button></div>)}</div>}
        </section>
        <div className="modal-actions"><button className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" disabled={!form.name.trim()} onClick={submit}><Check size={16} /> Save product</button></div>
      </div>
    </div>
  );
}

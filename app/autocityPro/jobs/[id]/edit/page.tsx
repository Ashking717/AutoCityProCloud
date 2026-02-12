"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";
import {
  Search,
  Plus,
  Trash2,
  Car,
  Wrench,
  X,
  Calendar,
  FileText,
  ChevronLeft,
  Save,
  UserCog,
} from "lucide-react";
import {
  carMakesModels,
  carColors,
  carYears,
  CarMake,
} from "@/lib/data/carData";
import toast from "react-hot-toast";
import VoiceNoteRecorder, {
  type VoiceNoteEntry,
} from "@/components/ui/Voicenoterecorder";

interface JobItem {
  productId?: string;
  productName: string;
  sku: string;
  isLabor?: boolean;
  unit: string;
  quantity: number;
  estimatedPrice: number;
  actualPrice?: number;
  discount: number;
  discountType: "percentage" | "fixed";
  taxRate: number;
  notes?: string;
}

export default function EditJobPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params?.id as string;
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Data
  const [products, setProducts] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);

  // Search
  const [searchTerm, setSearchTerm] = useState("");

  // Job Data
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [items, setItems] = useState<JobItem[]>([]);
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");
  const [status, setStatus] = useState<"DRAFT" | "PENDING" | "IN_PROGRESS" | "COMPLETED">("DRAFT");
  const [assignedTo, setAssignedTo] = useState("");
  const [estimatedStartDate, setEstimatedStartDate] = useState("");
  const [estimatedCompletionDate, setEstimatedCompletionDate] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [voiceNotes, setVoiceNotes] = useState<VoiceNoteEntry[]>([]);
  const [isVoiceUploading, setIsVoiceUploading] = useState(false);

  // Modals
  const [showAddLabor, setShowAddLabor] = useState(false);

  // Labor Charge
  const [laborCharge, setLaborCharge] = useState({ description: "", hours: 1, notes: "" });

  // Current user display name for voice note attribution
  const displayName = user
    ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email
    : "Unknown";

  const isAdmin = user?.role === "admin" || user?.role === "manager";

  useEffect(() => {
    fetchUser();
    fetchProducts();
    fetchStaff();
    if (jobId) fetchJob();
  }, [jobId]);

  useEffect(() => {
    const checkIfMobile = () => setIsMobile(window.innerWidth < 768);
    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);
    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);

  const fetchUser = async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) { const data = await res.json(); setUser(data.user); }
    } catch { console.error("Failed to fetch user"); }
  };

  const fetchJob = async () => {
    setInitialLoading(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        const job = data.job;

        setJobTitle(job.title);
        setJobDescription(job.description || "");
        setItems(
          job.items.map((item: any) => ({
            productId: item.productId || undefined,
            productName: item.productName,
            sku: item.sku,
            isLabor: item.isLabor || false,
            unit: item.unit,
            quantity: item.quantity,
            estimatedPrice: item.estimatedPrice || 0,
            actualPrice: item.actualPrice,
            discount: item.discount || 0,
            discountType: item.discountType || "percentage",
            taxRate: item.taxRate || 0,
            notes: item.notes,
          }))
        );
        setPriority(job.priority);
        setStatus(job.status);
        setAssignedTo(job.assignedTo?._id || "");
        setEstimatedStartDate(
          job.estimatedStartDate
            ? new Date(job.estimatedStartDate).toISOString().split("T")[0]
            : ""
        );
        setEstimatedCompletionDate(
          job.estimatedCompletionDate
            ? new Date(job.estimatedCompletionDate).toISOString().split("T")[0]
            : ""
        );
        setInternalNotes(job.internalNotes || "");
        setCustomerNotes(job.customerNotes || "");

        // Normalise legacy string[] → VoiceNoteEntry[]
        const rawNotes = job.voiceNotes ?? [];
        setVoiceNotes(
          rawNotes.map((v: any) =>
            typeof v === "string"
              ? { url: v, recordedByName: "Unknown", recordedAt: new Date().toISOString() }
              : {
                  url: v.url,
                  recordedByName: v.recordedByName,
                  recordedAt:
                    typeof v.recordedAt === "string"
                      ? v.recordedAt
                      : new Date(v.recordedAt).toISOString(),
                }
          )
        );
      } else {
        toast.error("Job not found");
        router.push("/autocityPro/jobs");
      }
    } catch {
      toast.error("Failed to load job");
    } finally {
      setInitialLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products?limit=100", { credentials: "include" });
      if (res.ok) { const data = await res.json(); setProducts(data.products || []); }
    } catch { console.error("Failed to fetch products"); }
  };

  const fetchStaff = async () => {
    try {
      const res = await fetch("/api/users", { credentials: "include" });
      if (res.ok) { const data = await res.json(); setStaff(data.users || []); }
    } catch { console.error("Failed to fetch staff"); }
  };

  const handleAddLabor = () => {
    if (!laborCharge.description) { toast.error("Labor description is required"); return; }
    const laborItem: JobItem = {
      productName: `Labor: ${laborCharge.description}`,
      sku: "LABOR",
      isLabor: true,
      unit: "hours",
      quantity: laborCharge.hours,
      estimatedPrice: 0,
      discount: 0,
      discountType: "percentage",
      taxRate: 0,
      notes: laborCharge.notes,
    };
    setItems([...items, laborItem]);
    setShowAddLabor(false);
    setLaborCharge({ description: "", hours: 1, notes: "" });
    toast.success("Labor charge added!");
  };

  const addToItems = (product: any) => {
    const existingItem = items.find((item) => item.productId === product._id);
    if (existingItem) {
      updateItem(items.indexOf(existingItem), "quantity", existingItem.quantity + 1);
    } else {
      setItems([...items, {
        productId: product._id,
        productName: product.name,
        sku: product.sku,
        isLabor: false,
        unit: product.unit || "pcs",
        quantity: 1,
        estimatedPrice: product.sellingPrice,
        discount: 0,
        discountType: "percentage",
        taxRate: product.taxRate || 0,
      }]);
    }
    toast.success("Added to job");
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
    toast.success("Removed from job");
  };

  const updateItem = (index: number, field: string, value: any) => {
    setItems(items.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const handleSubmit = async () => {
    if (!jobTitle.trim()) { toast.error("Please enter a job title"); return; }
    if (items.length === 0) { toast.error("Please add at least one item or labor charge"); return; }
    if (isVoiceUploading)   { toast.error("Please wait — voice note is still uploading"); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: jobTitle,
          description: jobDescription || undefined,
          items: items.map((item) => {
            const product = products.find((p) => p._id === item.productId);
            return {
              productId: item.productId || undefined,
              productName:
                item.productName ||
                product?.name ||
                (item.isLabor ? item.productName : "Unnamed Item"),
              sku: item.sku,
              quantity: item.quantity,
              unit: item.unit,
              estimatedPrice: item.estimatedPrice,
              discount: item.discount,
              discountType: item.discountType,
              taxRate: item.taxRate,
              isLabor: item.isLabor || false,
              notes: item.notes || undefined,
            };
          }),
          priority,
          status,
          assignedTo: assignedTo || undefined,
          estimatedStartDate: estimatedStartDate || undefined,
          estimatedCompletionDate: estimatedCompletionDate || undefined,
          internalNotes: internalNotes || undefined,
          customerNotes: customerNotes || undefined,
          voiceNotes,
        }),
      });

      if (res.ok) {
        toast.success("Job updated successfully!");
        router.push(`/autocityPro/jobs/${jobId}`);
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to update job");
      }
    } catch (error) {
      console.error("Error updating job:", error);
      toast.error("Failed to update job");
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    if (!searchTerm) return false;
    const term = searchTerm.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      p.sku.toLowerCase().includes(term) ||
      p.partNumber?.toLowerCase().includes(term)
    );
  });

  const getPriorityColor = (p: string) => {
    switch (p) {
      case "LOW":    return "bg-gray-500/20 text-gray-300 border-gray-500/30";
      case "MEDIUM": return "bg-blue-500/20 text-blue-300 border-blue-500/30";
      case "HIGH":   return "bg-orange-500/20 text-orange-300 border-orange-500/30";
      case "URGENT": return "bg-red-500/20 text-red-300 border-red-500/30";
      default:       return "bg-gray-500/20 text-gray-300 border-gray-500/30";
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "/autocityPro/login";
  };

  if (initialLoading) {
    return (
      <MainLayout user={user} onLogout={handleLogout}>
        <div className="flex items-center justify-center min-h-screen bg-[#050505]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#E84545] mb-3" />
            <p className="text-gray-400">Loading job...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout user={user} onLogout={handleLogout}>
      {/* Mobile Header */}
      <div className="md:hidden fixed top-16 left-0 right-0 z-40 bg-gradient-to-br from-[#0A0A0A] via-[#050505] to-[#0A0A0A] border-b border-white/5 backdrop-blur-xl">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <button onClick={() => router.back()} className="p-2 rounded-xl bg-white/5 text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-white">Edit Job</h1>
                <p className="text-xs text-white/60">{items.length} item{items.length !== 1 ? "s" : ""}</p>
              </div>
            </div>
            <button
              onClick={handleSubmit}
              disabled={loading || isVoiceUploading}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-lg text-sm font-semibold active:scale-95 transition-all shadow-lg disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              Save
            </button>
          </div>
          {items.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/5 rounded-lg px-3 py-2 border border-white/5">
                <p className="text-[10px] text-white/60 uppercase">Items</p>
                <p className="text-sm font-bold text-white">{items.length}</p>
              </div>
              <div className="bg-white/5 rounded-lg px-3 py-2 border border-white/5">
                <p className="text-[10px] text-white/60 uppercase">Priority</p>
                <p className="text-sm font-bold text-white">{priority}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:block py-12 bg-gradient-to-br from-[#932222] via-[#411010] to-[#a20c0c] border-b border-white/5 shadow-lg">
        <div className="px-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button onClick={() => router.back()} className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-white mb-1 flex items-center">
                  <Wrench className="h-6 w-6 mr-2" />
                  Edit Job
                </h1>
                <p className="text-base text-white/90">{jobTitle || "Untitled Job"}</p>
              </div>
            </div>
            <button
              onClick={handleSubmit}
              disabled={loading || isVoiceUploading}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-lg font-semibold hover:from-[#cc3c3c] hover:to-[#E84545] disabled:opacity-50 transition-all shadow-lg"
            >
              <Save className="h-5 w-5" />
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 md:px-6 pt-[180px] md:pt-6 pb-24 bg-[#050505] min-h-screen">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Job Title, Description & Voice Notes */}
            <div className="bg-[#0A0A0A] rounded-lg shadow-lg border border-white/5 p-4 md:p-6">
              <h2 className="text-lg font-bold mb-4 text-white flex items-center">
                <FileText className="h-5 w-5 mr-2 text-[#E84545]" />
                Job Details
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-white">Job Title *</label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g., Oil Change & Brake Inspection"
                    className="w-full px-3 py-3 bg-[#111111] border border-white/5 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-white">Description (Optional)</label>
                  <textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Additional details about the job..."
                    rows={3}
                    className="w-full px-3 py-3 bg-[#111111] border border-white/5 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-[#E84545] focus:border-transparent resize-none"
                  />
                </div>

                {/* Voice Notes */}
                <div className="border-t border-white/5 pt-4">
                  <VoiceNoteRecorder
                    voiceNotes={voiceNotes}
                    onChange={setVoiceNotes}
                    onUploadingChange={setIsVoiceUploading}
                    recordedByName={displayName}
                    label="Voice Notes (optional)"
                  />
                  {isVoiceUploading && (
                    <p className="text-xs text-yellow-400 flex items-center gap-1.5 mt-2">
                      <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Voice note uploading — please wait before saving…
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Product Search */}
            <div className="bg-[#0A0A0A] rounded-lg shadow-lg border border-white/5 p-4 md:p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search parts by name, SKU..."
                    className="w-full pl-10 pr-4 py-3 bg-[#111111] border border-white/5 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                  />
                </div>
                <button
                  onClick={() => setShowAddLabor(true)}
                  className="flex items-center space-x-2 px-4 py-3 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-lg hover:from-[#cc3c3c] hover:to-[#E84545] whitespace-nowrap transition-all shadow-lg"
                >
                  <Wrench className="h-5 w-5" />
                  <span className="hidden md:inline">Add Labor</span>
                </button>
              </div>
              {searchTerm && (
                <div className="mt-4">
                  <p className="text-sm text-gray-400 mb-3">
                    {filteredProducts.length} product{filteredProducts.length !== 1 ? "s" : ""} found
                  </p>
                  <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
                    {filteredProducts.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        <Search className="h-12 w-12 mx-auto mb-3 text-gray-600" />
                        <p>No products found</p>
                      </div>
                    ) : (
                      filteredProducts.map((product) => (
                        <div
                          key={product._id}
                          onClick={() => addToItems(product)}
                          className="p-4 bg-[#111111] border border-white/5 rounded-lg hover:border-[#E84545]/50 hover:shadow-[#E84545]/20 hover:shadow-md cursor-pointer transition-all"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h3 className="font-semibold text-white">{product.name}</h3>
                              <p className="text-xs text-gray-400 mt-1">
                                SKU: {product.sku}{product.partNumber && ` | Part#: ${product.partNumber}`}
                              </p>
                            </div>
                            <div className="text-right ml-3">
                              <p className="text-xs text-gray-400">Stock: {product.currentStock}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Items List */}
            <div className="bg-[#0A0A0A] rounded-lg shadow-lg border border-white/5 p-4 md:p-6">
              <h2 className="text-lg md:text-xl font-bold mb-4 flex items-center text-white">
                <Wrench className="h-5 w-5 mr-2 text-[#E84545]" />
                Job Items ({items.length})
              </h2>
              <div className="space-y-3">
                {items.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <Wrench className="h-12 w-12 mx-auto mb-3 text-gray-600" />
                    <p>No items added yet</p>
                    <p className="text-sm mt-2">Search for parts or add labor charges</p>
                  </div>
                ) : (
                  items.map((item, index) => (
                    <div key={index} className="border border-white/5 rounded-lg p-3 md:p-4 bg-[#111111]">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-white text-sm md:text-base flex items-center">
                            {item.isLabor && <Wrench className="h-4 w-4 mr-2 text-[#E84545]" />}
                            {item.productName}
                          </h3>
                          <p className="text-xs text-gray-400 mt-1">SKU: {item.sku}</p>
                        </div>
                        <button onClick={() => removeItem(index)} className="text-[#E84545] hover:text-[#cc3c3c] transition-colors p-1">
                          <Trash2 className="h-4 w-4 md:h-5 md:w-5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, "quantity", parseFloat(e.target.value) || 1)}
                          placeholder="Qty"
                          min="1"
                          className="px-2 md:px-3 py-2 bg-[#111111] border border-white/5 rounded text-sm text-white focus:ring-1 focus:ring-[#E84545]"
                        />
                        <input
                          type="text"
                          value={item.notes || ""}
                          onChange={(e) => updateItem(index, "notes", e.target.value)}
                          placeholder="Notes (optional)"
                          className="px-2 md:px-3 py-2 bg-[#111111] border border-white/5 rounded text-sm text-white focus:ring-1 focus:ring-[#E84545]"
                        />
                      </div>
                      <div className="mt-2 flex justify-between items-center text-sm">
                        <span className="text-gray-400">Quantity: {item.quantity} {item.unit}</span>
                        {item.notes && (
                          <span className="text-xs text-gray-500 italic truncate max-w-[200px]">{item.notes}</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="bg-[#0A0A0A] rounded-lg shadow-lg border border-white/5 p-4 md:p-6">
              <h2 className="text-lg font-bold mb-4 text-white">Notes</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-white">Internal Notes</label>
                  <textarea
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    placeholder="Notes for internal use only..."
                    rows={3}
                    className="w-full px-3 py-2 bg-[#111111] border border-white/5 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-[#E84545] resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-white">Customer Notes</label>
                  <textarea
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                    placeholder="Notes visible to customer..."
                    rows={3}
                    className="w-full px-3 py-2 bg-[#111111] border border-white/5 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-[#E84545] resize-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Priority & Status */}
            <div className="bg-[#0A0A0A] rounded-lg shadow-lg border border-white/5 p-4 md:p-6">
              <h2 className="text-lg font-bold mb-4 text-white">Priority & Status</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-2 text-white">Priority</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["LOW", "MEDIUM", "HIGH", "URGENT"] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => setPriority(p)}
                        className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                          priority === p ? getPriorityColor(p) : "border-white/5 text-gray-400 hover:bg-white/5"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-white">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[#111111] border border-white/5 rounded-lg text-white focus:ring-2 focus:ring-[#E84545]"
                  >
                    <option value="DRAFT">DRAFT</option>
                    <option value="PENDING">PENDING</option>
                    <option value="IN_PROGRESS">IN PROGRESS</option>
                    <option value="COMPLETED">COMPLETED</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Assign Staff */}
            {isAdmin && (
              <div className="bg-[#0A0A0A] rounded-lg shadow-lg border border-[#E84545]/20 p-4 md:p-6">
                <h2 className="text-lg font-bold mb-2 text-white flex items-center">
                  <UserCog className="h-5 w-5 mr-2 text-[#E84545]" />
                  Assign Staff
                </h2>
                <p className="text-xs text-gray-400 mb-4">💡 Admin/Manager feature</p>
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="w-full px-3 py-2 bg-[#111111] border border-white/5 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white text-sm"
                >
                  <option value="">Unassigned</option>
                  {staff.map((s) => (
                    <option key={s._id} value={s._id}>{s.firstName} {s.lastName} ({s.role})</option>
                  ))}
                </select>
                {staff.length === 0 && <p className="text-xs text-yellow-400 mt-2">⚠️ No staff members found</p>}
              </div>
            )}

            {/* Schedule */}
            <div className="bg-[#0A0A0A] rounded-lg shadow-lg border border-white/5 p-4 md:p-6">
              <h2 className="text-lg font-bold mb-4 text-white flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-[#E84545]" />
                Schedule
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-2 text-white">Estimated Start</label>
                  <input
                    type="date"
                    value={estimatedStartDate}
                    onChange={(e) => setEstimatedStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#111111] border border-white/5 rounded-lg text-white focus:ring-2 focus:ring-[#E84545] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-white">Estimated Completion</label>
                  <input
                    type="date"
                    value={estimatedCompletionDate}
                    onChange={(e) => setEstimatedCompletionDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#111111] border border-white/5 rounded-lg text-white focus:ring-2 focus:ring-[#E84545] text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Save Button (Mobile) */}
            <div className="md:hidden bg-[#0A0A0A] rounded-lg shadow-lg border border-white/5 p-4">
              <button
                onClick={handleSubmit}
                disabled={loading || isVoiceUploading || !jobTitle.trim() || items.length === 0}
                className="w-full py-3 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-lg font-semibold disabled:opacity-50 transition-all shadow-lg"
              >
                {loading ? "Saving..." : "Save Changes"}
              </button>
              <p className="text-xs text-gray-400 mt-3 text-center">
                {items.length} item{items.length !== 1 ? "s" : ""} will be saved
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Add Labor Modal */}
      {showAddLabor && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0A0A0A] rounded-lg shadow-2xl max-w-md w-full border border-white/5">
            <div className="flex justify-between items-center px-6 py-4 border-b border-white/5">
              <h2 className="text-xl font-bold flex items-center text-white">
                <Wrench className="h-5 w-5 mr-2 text-[#E84545]" />
                Add Labor Charge
              </h2>
              <button onClick={() => setShowAddLabor(false)} className="text-gray-400 hover:text-white">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-white">Description *</label>
                <input type="text" value={laborCharge.description} onChange={(e) => setLaborCharge({ ...laborCharge, description: e.target.value })} placeholder="e.g., Engine repair, Oil change" className="w-full px-3 py-2 bg-[#111111] border border-white/5 rounded-lg text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-white">Hours/Quantity</label>
                <input type="number" value={laborCharge.hours} onChange={(e) => setLaborCharge({ ...laborCharge, hours: parseFloat(e.target.value) || 1 })} min="0.5" step="0.5" className="w-full px-3 py-2 bg-[#111111] border border-white/5 rounded-lg text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-white">Notes</label>
                <textarea value={laborCharge.notes} onChange={(e) => setLaborCharge({ ...laborCharge, notes: e.target.value })} rows={2} placeholder="Additional details about the work..." className="w-full px-3 py-2 bg-[#111111] border border-white/5 rounded-lg text-white resize-none" />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button onClick={() => setShowAddLabor(false)} className="px-4 py-2 border border-white/5 text-gray-300 rounded-lg">Cancel</button>
                <button onClick={handleAddLabor} className="px-4 py-2 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-lg">Add Labor</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
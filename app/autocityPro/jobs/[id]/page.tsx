"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";
import {
  ChevronLeft,
  Edit,
  Trash2,
  User,
  Car,
  Calendar,
  FileText,
  Wrench,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowRight,
  Package,
  UserCog,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";
import VoiceNoteRecorder, {
  type VoiceNoteEntry,
} from "@/components/ui/Voicenoterecorder";

interface IJob {
  _id: string;
  jobNumber: string;
  customerId: any;
  customerName: string;
  vehicleRegistrationNumber?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  vehicleColor?: string;
  vehicleVIN?: string;
  vehicleMileage?: number;
  title: string;
  description?: string;
  items: any[];
  status: string;
  priority: string;
  assignedTo?: any;
  estimatedStartDate?: string;
  estimatedCompletionDate?: string;
  actualStartDate?: string;
  actualCompletionDate?: string;
  internalNotes?: string;
  customerNotes?: string;
  voiceNotes: VoiceNoteEntry[];
  convertedToSale: boolean;
  saleId?: string;
  saleInvoiceNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export default function JobDetailPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params?.id as string;

  const [user, setUser] = useState<any>(null);
  const [job, setJob] = useState<IJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const isAdmin = user?.role === "admin" || user?.role === "manager";

  useEffect(() => {
    fetchUser();
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
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setJob(data.job);
      } else {
        toast.error("Job not found");
        router.push("/autocityPro/jobs");
      }
    } catch {
      toast.error("Failed to load job");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!job) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        toast.success(`Status updated to ${newStatus}`);
        fetchJob();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to update status");
      }
    } catch {
      toast.error("Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to cancel this job?")) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}`, { method: "DELETE", credentials: "include" });
      if (res.ok) {
        toast.success("Job cancelled");
        router.push("/autocityPro/jobs");
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to cancel job");
      }
    } catch {
      toast.error("Failed to cancel job");
    } finally {
      setUpdating(false);
    }
  };

  const handleConvertToSale = () => {
    if (!job) return;
    router.push(`/autocityPro/sales/new?jobId=${job._id}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DRAFT":       return "bg-gray-500/20 text-gray-300 border-gray-500/30";
      case "PENDING":     return "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
      case "IN_PROGRESS": return "bg-blue-500/20 text-blue-300 border-blue-500/30";
      case "COMPLETED":   return "bg-green-500/20 text-green-300 border-green-500/30";
      case "CANCELLED":   return "bg-red-500/20 text-red-300 border-red-500/30";
      default:            return "bg-gray-500/20 text-gray-300 border-gray-500/30";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "LOW":    return "bg-gray-500/20 text-gray-300";
      case "MEDIUM": return "bg-blue-500/20 text-blue-300";
      case "HIGH":   return "bg-orange-500/20 text-orange-300";
      case "URGENT": return "bg-red-500/20 text-red-300";
      default:       return "bg-gray-500/20 text-gray-300";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "DRAFT":       return <FileText className="h-3 w-3 md:h-4 md:w-4" />;
      case "PENDING":     return <Clock className="h-3 w-3 md:h-4 md:w-4" />;
      case "IN_PROGRESS": return <RefreshCw className="h-3 w-3 md:h-4 md:w-4" />;
      case "COMPLETED":   return <CheckCircle className="h-3 w-3 md:h-4 md:w-4" />;
      case "CANCELLED":   return <XCircle className="h-3 w-3 md:h-4 md:w-4" />;
      default:            return <AlertCircle className="h-3 w-3 md:h-4 md:w-4" />;
    }
  };

  const getNextStatuses = (currentStatus: string) => {
    switch (currentStatus) {
      case "DRAFT":       return ["PENDING"];
      case "PENDING":     return ["IN_PROGRESS", "DRAFT"];
      case "IN_PROGRESS": return ["COMPLETED", "PENDING"];
      default:            return [];
    }
  };

  // Normalise voice notes to ensure recordedAt is always a string
  const normalisedVoiceNotes: VoiceNoteEntry[] = (job?.voiceNotes ?? []).map((v: any) =>
    typeof v === "string"
      ? { url: v, recordedByName: "Unknown", recordedAt: new Date().toISOString() }
      : {
          url: v.url,
          recordedByName: v.recordedByName ?? "Unknown",
          recordedAt:
            typeof v.recordedAt === "string"
              ? v.recordedAt
              : new Date(v.recordedAt).toISOString(),
        }
  );

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "/autocityPro/login";
  };

  if (loading) {
    return (
      <MainLayout user={user} onLogout={handleLogout}>
        <div className="flex items-center justify-center min-h-screen bg-[#050505]">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 text-[#E84545] animate-spin mx-auto mb-3" />
            <p className="text-gray-400">Loading job...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!job) {
    return (
      <MainLayout user={user} onLogout={handleLogout}>
        <div className="flex items-center justify-center min-h-screen bg-[#050505]">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
            <p className="text-white text-lg">Job not found</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  const nextStatuses = getNextStatuses(job.status);

  return (
    <MainLayout user={user} onLogout={handleLogout}>
      {/* Mobile Header */}
      <div className="md:hidden fixed top-16 left-0 right-0 z-40 bg-gradient-to-br from-[#0A0A0A] via-[#050505] to-[#0A0A0A] border-b border-white/5 backdrop-blur-xl">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => router.back()} className="p-2 rounded-xl bg-white/5 text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-lg font-bold text-white">{job.jobNumber}</h1>
                <p className="text-xs text-white/60 truncate max-w-[200px]">{job.title}</p>
              </div>
            </div>
            {job.status !== "CANCELLED" && !job.convertedToSale && (
              <button
                onClick={() => router.push(`/autocityPro/jobs/${jobId}/edit`)}
                className="p-2 rounded-xl bg-[#E84545] text-white active:scale-95 transition-all"
              >
                <Edit className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:block py-12 bg-gradient-to-br from-[#932222] via-[#411010] to-[#a20c0c] border-b border-white/5 shadow-lg">
        <div className="px-6">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <button onClick={() => router.back()} className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-white mb-1">{job.jobNumber}</h1>
                <p className="text-base text-white/90">{job.title}</p>
              </div>
            </div>
            <div className="flex gap-3">
              {job.status !== "CANCELLED" && !job.convertedToSale && (
                <>
                  <button
                    onClick={() => router.push(`/autocityPro/jobs/${jobId}/edit`)}
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all"
                  >
                    <Edit className="h-4 w-4" />
                    Edit Job
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={updating}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-all disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Cancel Job
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 md:px-6 pt-[120px] md:pt-6 pb-24 bg-[#050505] min-h-screen">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status & Actions */}
            <div className="bg-[#0A0A0A] rounded-lg shadow-lg border border-white/5 p-4 md:p-6">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className={`px-3 py-1.5 rounded-lg text-sm font-medium border flex items-center gap-2 ${getStatusColor(job.status)}`}>
                  {getStatusIcon(job.status)}
                  {job.status}
                </span>
                <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${getPriorityColor(job.priority)}`}>
                  {job.priority}
                </span>
                {job.convertedToSale && (
                  <span className="px-3 py-1.5 bg-green-500/20 text-green-300 rounded-lg text-sm font-medium border border-green-500/30 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Converted to Sale
                  </span>
                )}
              </div>

              {nextStatuses.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm text-gray-400 mb-2">Change Status:</p>
                  <div className="flex flex-wrap gap-2">
                    {nextStatuses.map((s) => (
                      <button
                        key={s}
                        onClick={() => handleStatusChange(s)}
                        disabled={updating}
                        className="flex items-center gap-2 px-4 py-2 bg-[#111111] border border-white/5 rounded-lg text-white hover:bg-white/5 transition-all disabled:opacity-50 active:scale-95"
                      >
                        {getStatusIcon(s)}
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {job.status === "COMPLETED" && !job.convertedToSale && (
                <button
                  onClick={handleConvertToSale}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all shadow-lg font-semibold"
                >
                  <ArrowRight className="h-5 w-5" />
                  Convert to Sale
                </button>
              )}

              {job.convertedToSale && job.saleInvoiceNumber && (
                <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <p className="text-sm text-green-300">
                    Converted to sale:{" "}
                    <span className="font-mono font-bold">{job.saleInvoiceNumber}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Description */}
            {job.description && (
              <div className="bg-[#0A0A0A] rounded-lg shadow-lg border border-white/5 p-4 md:p-6">
                <h2 className="text-lg font-bold mb-3 text-white flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-[#E84545]" />
                  Description
                </h2>
                <p className="text-gray-300 whitespace-pre-wrap">{job.description}</p>
              </div>
            )}

            {/* Items */}
            <div className="bg-[#0A0A0A] rounded-lg shadow-lg border border-white/5 p-4 md:p-6">
              <h2 className="text-lg font-bold mb-4 text-white flex items-center">
                <Package className="h-5 w-5 mr-2 text-[#E84545]" />
                Items ({job.items.length})
              </h2>
              <div className="space-y-3">
                {job.items.map((item, index) => (
                  <div key={index} className="border border-white/5 rounded-lg p-3 md:p-4 bg-[#111111]">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-white text-sm md:text-base flex items-center">
                          {item.isLabor && <Wrench className="h-4 w-4 mr-2 text-[#E84545]" />}
                          {item.name}
                        </h3>
                        <p className="text-xs text-gray-400 mt-1">SKU: {item.sku}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-gray-400">Quantity:</p>
                        <p className="text-white font-medium">{item.quantity} {item.unit}</p>
                      </div>
                      {item.notes && (
                        <div className="col-span-2">
                          <p className="text-gray-400">Notes:</p>
                          <p className="text-white">{item.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Text Notes */}
            {(job.internalNotes || job.customerNotes) && (
              <div className="bg-[#0A0A0A] rounded-lg shadow-lg border border-white/5 p-4 md:p-6">
                <h2 className="text-lg font-bold mb-4 text-white">Notes</h2>
                {job.internalNotes && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-400 mb-1">Internal Notes:</p>
                    <p className="text-white whitespace-pre-wrap">{job.internalNotes}</p>
                  </div>
                )}
                {job.customerNotes && (
                  <div>
                    <p className="text-sm font-medium text-gray-400 mb-1">Customer Notes:</p>
                    <p className="text-white whitespace-pre-wrap">{job.customerNotes}</p>
                  </div>
                )}
              </div>
            )}

            {/* Voice Notes — read-only playback with recorder info */}
            {normalisedVoiceNotes.length > 0 && (
              <div className="bg-[#0A0A0A] rounded-lg shadow-lg border border-white/5 p-4 md:p-6">
                <VoiceNoteRecorder
                  voiceNotes={normalisedVoiceNotes}
                  onChange={() => {}}
                  recordedByName=""
                  readOnly
                  label={`Voice Notes (${normalisedVoiceNotes.length})`}
                  maxNotes={10}
                />
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Customer */}
            <div className="bg-[#0A0A0A] rounded-lg shadow-lg border border-white/5 p-4 md:p-6">
              <h2 className="text-lg font-bold mb-4 text-white flex items-center">
                <User className="h-5 w-5 mr-2 text-[#E84545]" />
                Customer
              </h2>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-gray-400">Name:</p>
                  <p className="text-white font-medium">{job.customerName}</p>
                </div>
              </div>
            </div>

            {/* Vehicle */}
            {job.vehicleRegistrationNumber && (
              <div className="bg-[#0A0A0A] rounded-lg shadow-lg border border-white/5 p-4 md:p-6">
                <h2 className="text-lg font-bold mb-4 text-white flex items-center">
                  <Car className="h-5 w-5 mr-2 text-[#E84545]" />
                  Vehicle
                </h2>
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-gray-400">Registration:</p>
                    <p className="text-white font-mono font-bold">{job.vehicleRegistrationNumber}</p>
                  </div>
                  {job.vehicleMake && (
                    <div>
                      <p className="text-gray-400">Make & Model:</p>
                      <p className="text-white">{job.vehicleMake} {job.vehicleModel}</p>
                    </div>
                  )}
                  {job.vehicleYear && (
                    <div>
                      <p className="text-gray-400">Year:</p>
                      <p className="text-white">{job.vehicleYear}</p>
                    </div>
                  )}
                  {job.vehicleColor && (
                    <div>
                      <p className="text-gray-400">Color:</p>
                      <p className="text-white">{job.vehicleColor}</p>
                    </div>
                  )}
                  {job.vehicleMileage && (
                    <div>
                      <p className="text-gray-400">Mileage:</p>
                      <p className="text-white">{job.vehicleMileage} km</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Assigned Staff */}
            {job.assignedTo && (
              <div className="bg-[#0A0A0A] rounded-lg shadow-lg border border-blue-500/20 p-4 md:p-6">
                <h2 className="text-lg font-bold mb-4 text-white flex items-center">
                  <UserCog className="h-5 w-5 mr-2 text-blue-400" />
                  Assigned Staff
                </h2>
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-blue-300 font-semibold">
                    {job.assignedTo.firstName} {job.assignedTo.lastName}
                  </p>
                  <p className="text-xs text-blue-400 mt-1">{job.assignedTo.role}</p>
                </div>
              </div>
            )}

            {/* Dates */}
            <div className="bg-[#0A0A0A] rounded-lg shadow-lg border border-white/5 p-4 md:p-6">
              <h2 className="text-lg font-bold mb-4 text-white flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-[#E84545]" />
                Dates
              </h2>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-400">Created:</p>
                  <p className="text-white">{new Date(job.createdAt).toLocaleString()}</p>
                </div>
                {job.estimatedStartDate && (
                  <div>
                    <p className="text-gray-400">Estimated Start:</p>
                    <p className="text-white">{new Date(job.estimatedStartDate).toLocaleDateString()}</p>
                  </div>
                )}
                {job.estimatedCompletionDate && (
                  <div>
                    <p className="text-gray-400">Estimated Completion:</p>
                    <p className="text-white">{new Date(job.estimatedCompletionDate).toLocaleDateString()}</p>
                  </div>
                )}
                {job.actualStartDate && (
                  <div>
                    <p className="text-gray-400">Actual Start:</p>
                    <p className="text-green-300">{new Date(job.actualStartDate).toLocaleDateString()}</p>
                  </div>
                )}
                {job.actualCompletionDate && (
                  <div>
                    <p className="text-gray-400">Actual Completion:</p>
                    <p className="text-green-300">{new Date(job.actualCompletionDate).toLocaleDateString()}</p>
                  </div>
                )}
                <div>
                  <p className="text-gray-400">Last Updated:</p>
                  <p className="text-white">{new Date(job.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
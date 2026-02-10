// app/autocityPro/jobs/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";
import {
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  ArrowRight,
  Wrench,
  User,
  Calendar,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

interface IJob {
  _id: string;
  jobNumber: string;
  customerId: {
    _id: string;
    name: string;
    phone: string;
    vehicleRegistrationNumber?: string;
  };
  customerName: string;
  title: string;
  description?: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: "DRAFT" | "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  estimatedGrandTotal: number;
  actualGrandTotal?: number;
  assignedTo?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  convertedToSale: boolean;
  saleInvoiceNumber?: string;
  estimatedCompletionDate?: string;
  actualCompletionDate?: string;
  createdAt: string;
  vehicleRegistrationNumber?: string;
  vehicleMake?: string;
  vehicleModel?: string;
}

export default function JobsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState<IJob[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<IJob[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [convertedFilter, setConvertedFilter] = useState<string>("all");

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Check if user is admin/manager
  const isAdmin = user?.role === "admin" || user?.role === "manager";

  useEffect(() => {
    fetchUser();
    fetchJobs();
  }, [page, statusFilter, priorityFilter, convertedFilter]);

  useEffect(() => {
    filterJobs();
  }, [jobs, searchTerm]);
  
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);
    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);

  const fetchUser = async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error("Failed to fetch user");
    }
  };

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });

      if (statusFilter !== "all") params.append("status", statusFilter);
      if (priorityFilter !== "all") params.append("priority", priorityFilter);
      if (convertedFilter !== "all") params.append("convertedToSale", convertedFilter);

      const res = await fetch(`/api/jobs?${params.toString()}`, {
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
        setTotalPages(data.pagination?.pages || 1);
      }
    } catch (error) {
      console.error("Failed to fetch jobs");
      toast.error("Failed to load jobs");
    } finally {
      setLoading(false);
    }
  };

  const filterJobs = () => {
    if (!searchTerm) {
      setFilteredJobs(jobs);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = jobs.filter((job) => {
      return (
        job.jobNumber.toLowerCase().includes(term) ||
        job.customerName.toLowerCase().includes(term) ||
        job.title.toLowerCase().includes(term) ||
        job.vehicleRegistrationNumber?.toLowerCase().includes(term) ||
        job.customerId?.phone?.includes(term)
      );
    });

    setFilteredJobs(filtered);
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm("Are you sure you want to cancel this job?")) return;

    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        toast.success("Job cancelled successfully");
        fetchJobs();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to cancel job");
      }
    } catch (error) {
      toast.error("Failed to cancel job");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DRAFT":
        return "bg-gray-500/20 text-gray-300 border-gray-500/30";
      case "PENDING":
        return "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
      case "IN_PROGRESS":
        return "bg-blue-500/20 text-blue-300 border-blue-500/30";
      case "COMPLETED":
        return "bg-green-500/20 text-green-300 border-green-500/30";
      case "CANCELLED":
        return "bg-red-500/20 text-red-300 border-red-500/30";
      default:
        return "bg-gray-500/20 text-gray-300 border-gray-500/30";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Clock className="h-3 w-3" />;
      case "IN_PROGRESS":
        return <Wrench className="h-3 w-3" />;
      case "COMPLETED":
        return <CheckCircle className="h-3 w-3" />;
      case "CANCELLED":
        return <XCircle className="h-3 w-3" />;
      default:
        return <AlertCircle className="h-3 w-3" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "LOW":
        return "bg-gray-500/20 text-gray-300";
      case "MEDIUM":
        return "bg-blue-500/20 text-blue-300";
      case "HIGH":
        return "bg-orange-500/20 text-orange-300";
      case "URGENT":
        return "bg-red-500/20 text-red-300";
      default:
        return "bg-gray-500/20 text-gray-300";
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "/autocityPro/login";
  };

  return (
    <MainLayout user={user} onLogout={handleLogout}>
      {/* Mobile Header */}
      <div className="md:hidden fixed top-16 left-0 right-0 z-40 bg-gradient-to-br from-[#0A0A0A] via-[#050505] to-[#0A0A0A] border-b border-white/5 backdrop-blur-xl">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold text-white flex items-center">
                <Wrench className="h-5 w-5 mr-2 text-[#E84545]" />
                Jobs
              </h1>
              <p className="text-xs text-white/60">
                {filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={() => router.push("/autocityPro/jobs/new")}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-lg text-sm font-semibold active:scale-95 transition-all shadow-lg"
            >
              <Plus className="h-4 w-4" />
              New
            </button>
          </div>
        </div>
      </div>
      
      {/* Desktop Header */}
      <div className="hidden md:block py-4 md:py-12 bg-gradient-to-br from-[#932222] via-[#411010] to-[#a20c0c] border-b border-white/5 shadow-lg">
        <div className="px-4 md:px-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <h1 className="text-xl md:text-3xl font-bold text-white mb-1 flex items-center">
                <Wrench className="h-5 w-5 md:h-6 md:w-6 mr-2" />
                Jobs & Work Orders
              </h1>
              <p className="text-sm md:text-base text-white/90">
                Manage service jobs and work orders
              </p>
            </div>

            <button
              onClick={() => router.push("/autocityPro/jobs/new")}
              className="flex items-center justify-center space-x-2 px-4 py-3 bg-white text-[#E84545] rounded-lg font-semibold hover:bg-gray-100 transition-all shadow-lg"
            >
              <Plus className="h-5 w-5" />
              <span>New Job</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="px-4 md:px-6 pt-[140px] md:pt-6 py-6 bg-[#050505]">
        <div className="bg-[#0A0A0A] rounded-lg shadow-lg border border-white/5 p-4 md:p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search jobs..."
                  className="w-full pl-10 pr-4 py-2.5 bg-[#111111] border border-white/5 rounded-lg text-white focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                />
              </div>
            </div>

            {/* Desktop Filters */}
            <div className="hidden md:block">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2.5 bg-[#111111] border border-white/5 rounded-lg text-white focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
              >
                <option value="all">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="PENDING">Pending</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div className="hidden md:block">
              <select
                value={priorityFilter}
                onChange={(e) => {
                  setPriorityFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2.5 bg-[#111111] border border-white/5 rounded-lg text-white focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
              >
                <option value="all">All Priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            <div className="hidden md:block">
              <select
                value={convertedFilter}
                onChange={(e) => {
                  setConvertedFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2.5 bg-[#111111] border border-white/5 rounded-lg text-white focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
              >
                <option value="all">All Jobs</option>
                <option value="false">Not Converted</option>
                <option value="true">Converted to Sale</option>
              </select>
            </div>
            
            {/* Mobile Filter Button */}
            <button
              onClick={() => setShowMobileFilters(true)}
              className="md:hidden flex items-center justify-center gap-2 px-4 py-2.5 bg-[#111111] border border-white/5 rounded-lg text-white hover:bg-white/5 transition-colors"
            >
              <Filter className="h-5 w-5" />
              <span>Filters</span>
            </button>
          </div>
        </div>

        {/* Jobs List */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#E84545]"></div>
            <p className="mt-4">Loading jobs...</p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Wrench className="h-12 w-12 mx-auto mb-4 text-gray-600" />
            <p className="text-lg font-medium">No jobs found</p>
            <p className="text-sm mt-2">Create a new job to get started</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4">
              {filteredJobs.map((job) => (
                <div
                  key={job._id}
                  className="bg-[#0A0A0A] border border-white/5 rounded-lg p-4 md:p-6 hover:border-[#E84545]/30 transition-all group"
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    {/* Left: Job Info */}
                    <div className="flex-1">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <h3 className="text-base md:text-lg font-bold text-white">
                              {job.jobNumber}
                            </h3>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${getStatusColor(
                                job.status
                              )}`}
                            >
                              {getStatusIcon(job.status)}
                              <span className="hidden sm:inline">{job.status}</span>
                            </span>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(
                                job.priority
                              )}`}
                            >
                              {job.priority}
                            </span>
                            {job.convertedToSale && (
                              <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded-full text-xs font-medium border border-green-500/30">
                                ✓
                              </span>
                            )}
                          </div>

                          <h4 className="text-sm md:text-base font-semibold text-white mb-1">
                            {job.title}
                          </h4>
                          {job.description && (
                            <p className="text-xs md:text-sm text-gray-400 mb-2 line-clamp-2">
                              {job.description}
                            </p>
                          )}

                          <div className="flex flex-wrap gap-3 md:gap-4 text-xs md:text-sm text-gray-400">
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3 md:h-4 md:w-4" />
                              <span className="truncate max-w-[120px] md:max-w-none">{job.customerName}</span>
                            </div>
                            {job.vehicleRegistrationNumber && (
                              <div className="flex items-center gap-1 flex-wrap">
                                <span className="font-mono text-[#E84545]">
                                  {job.vehicleRegistrationNumber}
                                </span>
                                {job.vehicleMake && (
                                  <span className="hidden sm:inline">
                                    • {job.vehicleMake} {job.vehicleModel}
                                  </span>
                                )}
                              </div>
                            )}
                            {job.assignedTo && isAdmin && (
                              <div className="flex items-center gap-1">
                                <Wrench className="h-3 w-3 md:h-4 md:w-4" />
                                <span className="hidden sm:inline">
                                  {job.assignedTo.firstName}{" "}
                                  {job.assignedTo.lastName}
                                </span>
                                <span className="sm:hidden">Assigned</span>
                              </div>
                            )}
                          </div>

                          {job.estimatedCompletionDate && (
                            <div className="flex items-center gap-1 text-xs text-gray-500 mt-2">
                              <Calendar className="h-3 w-3" />
                              <span className="hidden sm:inline">Due: </span>
                              <span>
                                {new Date(
                                  job.estimatedCompletionDate
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          )}

                          {job.convertedToSale && job.saleInvoiceNumber && (
                            <div className="mt-2 text-xs text-green-400">
                              → {job.saleInvoiceNumber}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Amount & Actions */}
                    <div className="flex md:flex-col items-center md:items-end gap-3 justify-between md:justify-start">
                      <div className="text-left md:text-right flex-1 md:flex-none">
                        <p className="text-xs md:text-sm text-gray-400">
                          {job.actualGrandTotal ? "Actual" : "Estimate"}
                        </p>
                        <p className="text-lg md:text-xl font-bold text-white">
                          QAR{" "}
                          {(
                            job.actualGrandTotal || job.estimatedGrandTotal
                          ).toFixed(2)}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            router.push(`/autocityPro/jobs/${job._id}`)
                          }
                          className="p-2 bg-[#111111] border border-white/5 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 transition-colors active:scale-95"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        {job.status !== "CANCELLED" && !job.convertedToSale && (
                          <>
                            <button
                              onClick={() =>
                                router.push(`/autocityPro/jobs/${job._id}/edit`)
                              }
                              className="p-2 bg-[#111111] border border-white/5 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 transition-colors active:scale-95"
                              title="Edit Job"
                            >
                              <Edit className="h-4 w-4" />
                            </button>

                            <button
                              onClick={() => handleDeleteJob(job._id)}
                              className="p-2 bg-[#111111] border border-white/5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors active:scale-95"
                              title="Cancel Job"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Mobile Safe Area */}
            <div className="md:hidden h-20"></div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-6">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-[#111111] border border-white/5 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/5 transition-colors"
                >
                  Previous
                </button>
                <span className="text-white">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 bg-[#111111] border border-white/5 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/5 transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Mobile Filter Modal */}
      {showMobileFilters && isMobile && (
        <div className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-md z-[60]">
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-b from-[#0A0A0A] to-[#050505] rounded-t-3xl border-t border-white/10 p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">Filters</h2>
              <button
                onClick={() => setShowMobileFilters(false)}
                className="p-2 rounded-xl bg-white/5 text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-3 bg-[#111111] border border-white/5 rounded-xl text-white"
                >
                  <option value="all">All Statuses</option>
                  <option value="DRAFT">Draft</option>
                  <option value="PENDING">Pending</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Priority
                </label>
                <select
                  value={priorityFilter}
                  onChange={(e) => {
                    setPriorityFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-3 bg-[#111111] border border-white/5 rounded-xl text-white"
                >
                  <option value="all">All Priorities</option>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Conversion Status
                </label>
                <select
                  value={convertedFilter}
                  onChange={(e) => {
                    setConvertedFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-3 bg-[#111111] border border-white/5 rounded-xl text-white"
                >
                  <option value="all">All Jobs</option>
                  <option value="false">Not Converted</option>
                  <option value="true">Converted to Sale</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/10">
                <button
                  onClick={() => {
                    setStatusFilter("all");
                    setPriorityFilter("all");
                    setConvertedFilter("all");
                    setPage(1);
                  }}
                  className="flex-1 px-4 py-3 bg-[#111111] border border-white/10 rounded-xl text-gray-300 hover:text-white"
                >
                  Clear All
                </button>
                <button
                  onClick={() => setShowMobileFilters(false)}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] rounded-xl text-white font-semibold"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
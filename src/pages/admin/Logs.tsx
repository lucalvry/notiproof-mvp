import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface AuditLog {
  id: string;
  admin_id: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details: any;
  ip_address?: string;
  created_at: string;
  user_agent?: string;
}

interface IntegrationLog {
  id: string;
  integration_type: string;
  action: string;
  status: "success" | "error" | "warning" | "pending";
  details: any;
  error_message?: string;
  duration_ms?: number;
  created_at: string;
}

export default function AdminLogs() {
  const { loading: authLoading } = useAdminAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [integrationLogs, setIntegrationLogs] = useState<IntegrationLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      fetchLogs();
    }
  }, [authLoading, dateFilter, actionFilter]);

  const fetchLogs = async () => {
    try {
      setLoading(true);

      // Fetch audit logs
      let auditQuery = supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (dateFilter === "today") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        auditQuery = auditQuery.gte("created_at", today.toISOString());
      } else if (dateFilter === "week") {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        auditQuery = auditQuery.gte("created_at", weekAgo.toISOString());
      } else if (dateFilter === "month") {
        const monthAgo = new Date();
        monthAgo.setDate(monthAgo.getDate() - 30);
        auditQuery = auditQuery.gte("created_at", monthAgo.toISOString());
      }

      if (actionFilter !== "all") {
        auditQuery = auditQuery.eq("resource_type", actionFilter);
      }

      const { data: auditData, error: auditError } = await auditQuery;
      if (auditError) throw auditError;

      // Fetch integration logs
      let integrationQuery = supabase
        .from("integration_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (dateFilter === "today") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        integrationQuery = integrationQuery.gte("created_at", today.toISOString());
      } else if (dateFilter === "week") {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        integrationQuery = integrationQuery.gte("created_at", weekAgo.toISOString());
      } else if (dateFilter === "month") {
        const monthAgo = new Date();
        monthAgo.setDate(monthAgo.getDate() - 30);
        integrationQuery = integrationQuery.gte("created_at", monthAgo.toISOString());
      }

      const { data: integrationData, error: integrationError } = await integrationQuery;
      if (integrationError) throw integrationError;

      setAuditLogs(auditData || []);
      setIntegrationLogs((integrationData || []).map(log => ({
        ...log,
        status: log.status as "success" | "error" | "warning" | "pending"
      })));
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  const getActionBadge = (action: string) => {
    const actionTypes: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      user_suspended: "destructive",
      user_reactivated: "secondary",
      website_verified: "default",
      integration_configured: "outline",
    };
    return actionTypes[action] || "default";
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, "default" | "secondary" | "destructive"> = {
      success: "default",
      warning: "secondary",
      error: "destructive",
      pending: "outline" as any,
    };
    return statusMap[status] || "default";
  };

  const filteredAuditLogs = auditLogs.filter((log) => {
    if (!searchTerm) return true;
    return (
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resource_type.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const filteredIntegrationLogs = integrationLogs.filter((log) => {
    if (!searchTerm) return true;
    return (
      log.integration_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Logs</h1>
          <p className="text-muted-foreground">Monitor system activity and integration events</p>
        </div>
        <Button variant="outline" onClick={fetchLogs}>
          <Download className="mr-2 h-4 w-4" />
          Refresh Logs
        </Button>
      </div>

      <Tabs defaultValue="audit" className="space-y-4">
        <TabsList>
          <TabsTrigger value="audit">Audit Logs ({filteredAuditLogs.length})</TabsTrigger>
          <TabsTrigger value="integrations">Integration Logs ({filteredIntegrationLogs.length})</TabsTrigger>
        </TabsList>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search logs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Action type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="user">User Actions</SelectItem>
                  <SelectItem value="website">Website Actions</SelectItem>
                  <SelectItem value="integration">Integration Actions</SelectItem>
                </SelectContent>
              </Select>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Date range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Audit Logs Tab */}
        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Admin Actions</CardTitle>
              <CardDescription>All administrative actions performed on the platform</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredAuditLogs.length === 0 ? (
                <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                  <p>No audit logs found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAuditLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <Badge variant={getActionBadge(log.action)}>
                            {log.action.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm">{log.resource_type}</span>
                            {log.resource_id && (
                              <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                                {log.resource_id}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="rounded bg-muted px-2 py-1 text-xs max-w-[200px] block truncate">
                            {JSON.stringify(log.details)}
                          </code>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {log.ip_address || "N/A"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(log.created_at).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integration Logs Tab */}
        <TabsContent value="integrations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Integration Activity</CardTitle>
              <CardDescription>Third-party integration events and webhooks</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredIntegrationLogs.length === 0 ? (
                <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                  <p>No integration logs found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Integration</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredIntegrationLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">{log.integration_type}</TableCell>
                        <TableCell>{log.action.replace(/_/g, " ")}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadge(log.status)}>{log.status}</Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {log.error_message || JSON.stringify(log.details)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {log.duration_ms ? `${log.duration_ms}ms` : "N/A"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(log.created_at).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
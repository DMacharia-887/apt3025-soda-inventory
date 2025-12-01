import { useState, useEffect } from "react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { supabase } from "@/utils/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

// Borrower type inline for brevity
type Borrower = {
  borrower_id: string;
  first_name: string;
  last_name: string;
  phone: string;
};

interface AddApplicationDialogProps {
  onApplicationAdded?: () => void;
}

export function AddApplicationDialog({ onApplicationAdded }: AddApplicationDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Borrower list for dropdown
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [borrowerLoading, setBorrowerLoading] = useState(true);

  useEffect(() => {
    async function fetchBorrowers() {
      setBorrowerLoading(true);
      const { data, error } = await supabase
        .from("borrowers")
        .select("borrower_id, first_name, last_name, phone")
        .order("created_at", { ascending: false });
      if (!error && data) setBorrowers(data as Borrower[]);
      setBorrowerLoading(false);
    }
    fetchBorrowers();
  }, []);

  // Form state
  const [form, setForm] = useState({
    borrower_id: "",
    loan_amount: "",
    credit_score: "",
    risk_level: "",
    loan_purpose: "",
    status: "pending",
    notes: "",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm(f => ({
      ...f,
      [e.target.name]: e.target.value,
    }));
  }

  function handleSelectBorrower(value: string) {
    setForm(f => ({ ...f, borrower_id: value }));
  }

  function handleSelectRisk(value: string) {
    setForm(f => ({ ...f, risk_level: value }));
  }

  // Submit handler
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    // Validate required fields (you may want to do more here)
    if (!form.borrower_id || !form.loan_amount || !form.credit_score || !form.risk_level) {
      toast({
        title: "Missing fields",
        description: "Please fill all required fields.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Prepare payload (only schema fields!)
    const payload = {
      borrower_id: form.borrower_id,
      user_id: user.id,
      loan_amount: Number(form.loan_amount),
      credit_score: Number(form.credit_score),
      risk_level: form.risk_level,
      loan_purpose: form.loan_purpose || null,
      notes: form.notes || null,
      status: form.status || "pending", // Or "pending", "approved", "rejected"
      // application_id, created_at: omitted, auto-gen
    };

    try {
      const { error } = await supabase
        .from("credit_applications")
        .insert([payload]);
      if (error) throw error;
      toast({
        title: "Application Added",
        description: "Loan application created successfully.",
      });
      setOpen(false);
      onApplicationAdded?.();
      setForm({
        borrower_id: "",
        loan_amount: "",
        credit_score: "",
        risk_level: "",
        loan_purpose: "",
        status: "pending",
        notes: "",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Could not add application.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Application
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Loan Application</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Borrower Select */}
          <div className="space-y-2">
            <Label>Borrower</Label>
            <Select
              value={form.borrower_id}
              onValueChange={handleSelectBorrower}
              disabled={borrowerLoading}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder={borrowerLoading ? "Loading borrowers..." : "Select borrower"} />
              </SelectTrigger>
              <SelectContent>
                {borrowers.map(b => (
                  <SelectItem key={b.borrower_id} value={b.borrower_id}>
                    {b.first_name} {b.last_name} &ndash; {b.phone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="loan_amount">Loan Amount (KES)</Label>
              <Input
                id="loan_amount"
                name="loan_amount"
                type="number"
                min="1"
                required
                value={form.loan_amount}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="credit_score">Credit Score</Label>
              <Input
                id="credit_score"
                name="credit_score"
                type="number"
                min="1"
                max="100"
                required
                value={form.credit_score}
                onChange={handleChange}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Risk Level</Label>
            <Select value={form.risk_level} onValueChange={handleSelectRisk} required>
              <SelectTrigger>
                <SelectValue placeholder="Select risk level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="very-high">Very High</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="loan_purpose">Loan Purpose</Label>
            <Input
              id="loan_purpose"
              name="loan_purpose"
              value={form.loan_purpose}
              onChange={handleChange}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              value={form.notes}
              rows={2}
              onChange={handleChange}
            />
          </div>
          {/* Optionally allow status (else default to "pending") */}
          {/* <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div> */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Application"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

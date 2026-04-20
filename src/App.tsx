import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { 
  HardDrive, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRightLeft, 
  Signature, 
  PlusCircle, 
  BellRing,
  History,
  FileText,
  LogIn,
  User,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from './components/ui/card';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Textarea } from './components/ui/textarea';
import { Badge } from './components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { SignaturePad } from './components/SignaturePad';
import { DriveRecord, ActionLog, Issue, AppConfig } from './types';
import { cn } from './lib/utils';
import { auth, db, signInWithGoogle, signInWithGoogleRedirect, getRedirectResult } from './lib/firebase';
import firebaseConfig from '../firebase-applet-config.json';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { 
  doc, 
  onSnapshot, 
  setDoc, 
  updateDoc, 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  serverTimestamp
} from 'firebase/firestore';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAuthHelper, setShowAuthHelper] = useState(false);
  const [driveRecord, setDriveRecord] = useState<DriveRecord | null>(null);
  const [monthIssues, setMonthIssues] = useState<Issue[]>([]);
  
  const [transporterName, setTransporterName] = useState('');
  const [issueMessage, setIssueMessage] = useState('');
  const [issueSeverity, setIssueSeverity] = useState<'low' | 'medium' | 'high'>('low');

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error: any) {
      console.error("Auth Error:", error);
      if (error.code === 'auth/unauthorized-domain' || error.code === 'auth/popup-closed-by-user') {
        setShowAuthHelper(true);
        toast.error("Authentication Blocked", {
          description: "See the connection guide on the login screen.",
          duration: 10000
        });
      } else if (error.code === 'auth/popup-blocked') {
        toast.error("Popup blocked. Please allow popups or use Redirect method.");
      } else {
        toast.error("Authentication failed: " + error.message);
      }
    }
  };

  const handleSignInRedirect = async () => {
    try {
      await signInWithGoogleRedirect();
    } catch (error: any) {
      toast.error("Redirect Auth Failed: " + error.message);
    }
  };

  const monthId = format(new Date(), 'yyyy-MM');

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        // Only stop loading if we're not waiting for a redirect result
        getRedirectResult(auth).then((result) => {
          if (result) {
            setUser(result.user);
          }
          setLoading(false);
        }).catch((err) => {
          console.error("Redirect error", err);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    fetchConfig();
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    const recordRef = doc(db, 'driveRecords', monthId);
    const unsubscribeRecord = onSnapshot(recordRef, (snapshot) => {
      if (snapshot.exists()) {
        setDriveRecord(snapshot.data() as DriveRecord);
      } else {
        const initialRecord = {
          status: 'offsite',
          month: format(new Date(), 'MMMM yyyy')
        };
        setDoc(recordRef, initialRecord).catch(console.error);
      }
      setLoading(false);
    }, (error) => {
      console.error("Firestore Error:", error);
      toast.error("Database connection error");
      setLoading(false);
    });

    const issuesRef = collection(db, 'driveRecords', monthId, 'issues');
    const q = query(issuesRef, orderBy('timestamp', 'desc'));
    const unsubscribeIssues = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Issue));
      setMonthIssues(docs);
    });

    return () => {
      unsubscribeRecord();
      unsubscribeIssues();
    };
  }, [user, monthId]);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/config');
      const data = await res.json();
      setConfig(data);
    } catch (err) {
      console.error("Failed to fetch config", err);
    }
  };

  const triggerReminder = async () => {
    try {
      const res = await fetch('/api/reminders/trigger', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success("Reminder notification triggered!");
      }
    } catch (err) {
      toast.error("Failed to send reminder");
    }
  };

  const handleAction = async (type: 'check-in' | 'check-out', signature: string) => {
    if (!transporterName) {
      toast.error("Please enter transporter name");
      return;
    }

    const log = {
      timestamp: serverTimestamp(),
      transporterName,
      signature
    };

    const recordRef = doc(db, 'driveRecords', monthId);
    try {
      if (type === 'check-in') {
        await updateDoc(recordRef, {
          status: 'onsite',
          checkIn: log
        });
      } else {
        await updateDoc(recordRef, {
          status: 'offsite',
          checkOut: log
        });
      }
      setTransporterName('');
      toast.success(`Succesfully recorded ${type}`);
    } catch (err) {
      console.error(err);
      toast.error("Permission denied");
    }
  };

  const addIssue = async () => {
    if (!issueMessage || !user) return;

    try {
      const issuesRef = collection(db, 'driveRecords', monthId, 'issues');
      await addDoc(issuesRef, {
        timestamp: serverTimestamp(),
        reporter: user.displayName || user.email || 'Anonymous',
        message: issueMessage,
        severity: issueSeverity
      });
      setIssueMessage('');
      toast.success("Issue logged successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to log issue");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <HardDrive className="w-8 h-8 text-zinc-300 animate-pulse" />
          <p className="text-zinc-400 text-sm font-medium tracking-tight">Initializing VaultGuard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-8">
        <Card className="w-full max-w-sm border-zinc-200 shadow-sm rounded-lg overflow-hidden">
          <div className="p-12 space-y-8 flex flex-col items-center text-center">
             <div className="bg-zinc-900 w-12 h-12 rounded flex items-center justify-center shadow-lg">
                <ShieldCheck className="w-6 h-6 text-white" />
             </div>
             <div className="space-y-2">
                <h1 className="text-xl font-semibold tracking-tight text-zinc-900">VaultGuard Access</h1>
                <p className="text-xs text-zinc-500 leading-relaxed uppercase tracking-widest font-bold">Authorized Personnel Only</p>
             </div>
             <div className="w-full space-y-3">
               <Button onClick={handleSignIn} className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-medium rounded h-11">
                  Connect with Google
               </Button>
               <Button onClick={handleSignInRedirect} variant="outline" className="w-full border-zinc-200 text-zinc-500 font-medium rounded h-11 text-xs">
                  Alternative: Sign in with Redirect
               </Button>
             </div>

             {showAuthHelper && (
               <div className="pt-6 border-t border-zinc-100 w-full text-left animate-in fade-in slide-in-from-top-2 duration-500">
                 <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3 flex items-center gap-2">
                   <AlertTriangle className="w-3 h-3 text-amber-500" />
                   Connection Troubleshooter
                 </h4>
                 <div className="space-y-4 bg-zinc-50 p-4 rounded-lg border border-zinc-100">
                   <p className="text-[11px] text-zinc-600 leading-normal">
                     If the popup closed instantly, you MUST authorize these domains in your <strong>Firebase Console</strong> (Settings &gt; Authorized Domains):
                   </p>
                   <div className="space-y-1.5">
                     <div className="bg-white p-2 rounded border border-zinc-200 font-mono text-[9px] break-all select-all">
                       ais-dev-hxexaimr6vviqoxsnv4sto-756951329447.europe-west2.run.app
                     </div>
                     <div className="bg-white p-2 rounded border border-zinc-200 font-mono text-[9px] break-all select-all">
                       ais-pre-hxexaimr6vviqoxsnv4sto-756951329447.europe-west2.run.app
                     </div>
                   </div>
                   <p className="text-[10px] text-zinc-400 italic">
                     Authentication fails in this environment until the exact URL is whitelisted.
                   </p>
                 </div>
               </div>
             )}
          </div>
        </Card>
      </div>
    );
  }

  const currentRecord = driveRecord || { status: 'offsite', month: format(new Date(), 'MMMM yyyy'), checkIn: null, checkOut: null };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col p-8 font-sans transition-all duration-300 antialiased">
      <Toaster position="top-right" richColors />
      
      <div className="max-w-[1200px] mx-auto w-full flex-1 flex flex-col">
        {/* Header Section */}
        <header className="flex justify-between items-end border-b border-zinc-200 pb-6 mb-8">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">VaultGuard</h1>
            <p className="text-zinc-500 text-sm mt-1">Offsite Backup Asset Management</p>
          </div>
          <div className="flex flex-col items-end gap-2 px-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">{user.displayName || user.email}</span>
              <Button variant="ghost" size="sm" onClick={() => auth.signOut()} className="h-6 p-0 text-[10px] font-bold text-zinc-400 hover:text-zinc-900 uppercase tracking-widest">
                Logout
              </Button>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Current Cycle</p>
              <p className="text-xl font-medium">{currentRecord.month}</p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-12 gap-8 flex-1">
          {/* Main Content Area */}
          <section className="col-span-8 flex flex-col space-y-6">
            <div className="bg-white border border-zinc-200 rounded-lg shadow-sm flex-1 overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Asset Movement Log</h2>
                <Badge className={cn(
                  "px-2.5 py-0.5 text-[10px] font-bold rounded-full border shadow-none bg-transparent",
                  currentRecord.status === 'onsite' ? "text-emerald-700 bg-emerald-50 border-emerald-100" : "text-amber-700 bg-amber-50 border-amber-100"
                )}>
                  {currentRecord.status === 'onsite' ? 'Active Onsite' : 'Encryption Offsite'}
                </Badge>
              </div>
              
              <div className="flex-1">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-bold text-zinc-400 uppercase border-b border-zinc-100">
                      <th className="px-6 py-3">Event Type</th>
                      <th className="px-6 py-3">Transporter</th>
                      <th className="px-6 py-3">Timestamp</th>
                      <th className="px-6 py-3">Confirmation</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-zinc-100">
                    <tr className={cn("transition-colors", currentRecord.checkIn ? "bg-white" : "bg-zinc-50/30")}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <PlusCircle className={cn("w-3 h-3", currentRecord.checkIn ? "text-blue-500" : "text-zinc-300")} />
                          <span className={cn("font-medium", currentRecord.checkIn ? "text-zinc-900" : "text-zinc-400")}>Check-In</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                         {currentRecord.checkIn ? (
                           <span className="font-medium text-zinc-900">{currentRecord.checkIn.transporterName}</span>
                         ) : (
                           <span className="text-zinc-300 italic text-xs">Awaiting...</span>
                         )}
                      </td>
                      <td className="px-6 py-4">
                        {currentRecord.checkIn ? (
                          <span className="text-zinc-500">{(currentRecord.checkIn.timestamp as any)?.toDate?.() ? format((currentRecord.checkIn.timestamp as any).toDate(), 'MMM dd, hh:mm a') : 'Now'}</span>
                        ) : (
                          <span className="text-zinc-300">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {currentRecord.checkIn ? (
                          <img src={currentRecord.checkIn.signature} alt="Sign" className="h-6 opacity-60 hover:opacity-100 transition-opacity border border-zinc-100 p-0.5 rounded" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-12 h-4 bg-zinc-100 rounded animate-pulse" />
                        )}
                      </td>
                    </tr>
                    <tr className={cn("transition-colors", currentRecord.checkOut ? "bg-white" : "bg-zinc-50/30")}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <ArrowRightLeft className={cn("w-3 h-3", currentRecord.checkOut ? "text-orange-500" : "text-zinc-300")} />
                          <span className={cn("font-medium", currentRecord.checkOut ? "text-zinc-900" : "text-zinc-400")}>Check-Out</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                         {currentRecord.checkOut ? (
                           <span className="font-medium text-zinc-900">{currentRecord.checkOut.transporterName}</span>
                         ) : (
                           <span className="text-zinc-300 italic text-xs">Awaiting...</span>
                         )}
                      </td>
                      <td className="px-6 py-4">
                        {currentRecord.checkOut ? (
                          <span className="text-zinc-500">{(currentRecord.checkOut.timestamp as any)?.toDate?.() ? format((currentRecord.checkOut.timestamp as any).toDate(), 'MMM dd, hh:mm a') : 'Now'}</span>
                        ) : (
                          <span className="text-zinc-300">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {currentRecord.checkOut ? (
                          <img src={currentRecord.checkOut.signature} alt="Sign" className="h-6 opacity-60 hover:opacity-100 transition-opacity border border-zinc-100 p-0.5 rounded" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-12 h-4 bg-zinc-100 rounded animate-pulse" />
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div className="px-6 py-4 border-t border-zinc-100 bg-zinc-50/10">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-zinc-400 font-mono uppercase tracking-[0.1em]">Protocol: VaultGuard-2.4-SEC</p>
                  <p className="text-[10px] text-zinc-400 font-mono uppercase tracking-[0.1em]">Status: {currentRecord.status.toUpperCase()}</p>
                </div>
              </div>
            </div>

            {/* Issue Logging Area */}
            <div className="bg-white border border-zinc-200 rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Security Notes & Concerns</h3>
                <div className="flex items-center gap-2">
                  <select 
                    className="text-[10px] uppercase font-bold text-zinc-500 bg-zinc-50 px-2 h-7 rounded border border-zinc-200 outline-none"
                    value={issueSeverity}
                    onChange={(e) => setIssueSeverity(e.target.value as any)}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High Risk</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <Textarea 
                  placeholder="Record drive integrity observations or procedural anomalies..." 
                  className="flex-1 min-h-[80px] bg-zinc-50 border border-zinc-200 rounded p-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-zinc-400"
                  value={issueMessage}
                  onChange={(e) => setIssueMessage(e.target.value)}
                />
                <Button onClick={addIssue} className="px-6 h-10 bg-zinc-900 border-none text-white text-xs font-bold uppercase tracking-widest rounded hover:bg-zinc-800 shadow-none">
                  Add Log
                </Button>
              </div>
              
              {monthIssues.length > 0 && (
                <div className="mt-4 space-y-2 max-h-40 overflow-y-auto pr-2 scrollbar-hide">
                  {monthIssues.map((issue) => (
                    <div key={issue.id} className="flex items-start gap-3 p-3 bg-zinc-50 border border-zinc-100 rounded text-xs">
                      <div className={cn(
                        "w-1 h-1 rounded-full mt-1.5 shrink-0",
                        issue.severity === 'high' ? 'bg-red-500' : 
                        issue.severity === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
                      )} />
                      <div className="flex-1 space-y-1">
                        <p className="text-zinc-700 leading-relaxed font-medium">{issue.message}</p>
                        <div className="flex justify-between items-center opacity-40 font-bold uppercase tracking-tighter">
                          <span>{issue.reporter.split('@')[0]}</span>
                          <span>{(issue.timestamp as any)?.toDate?.() ? format((issue.timestamp as any).toDate(), 'MMM dd') : 'Now'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Sidebar Area */}
          <aside className="col-span-4 flex flex-col gap-6">
            {/* Transporter Confirmation Card */}
            <div className="bg-zinc-900 text-zinc-100 rounded-lg p-6 flex flex-col shadow-xl">
              <h2 className="text-xs font-semibold uppercase tracking-[0.2em] opacity-50 mb-4 inline-flex items-center gap-2">
                <Signature className="w-3 h-3" />
                Transporter Confirmation
              </h2>
              <p className="text-[10px] mb-6 leading-relaxed opacity-60 font-medium uppercase tracking-tight">
                Physical transfer verification of encrypted backup assets into secure facility custody.
              </p>
              
              <div className="space-y-4 mb-2">
                <div className="space-y-2">
                  <Label className="text-[9px] font-bold uppercase opacity-40">Personnel ID</Label>
                  <Input 
                    placeholder="Enter Full Legal Name"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/20 h-9 text-xs rounded shadow-none focus:ring-white/20"
                    value={transporterName}
                    onChange={(e) => setTransporterName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                   <Label className="text-[9px] font-bold uppercase opacity-40">Digital Signature</Label>
                   <div className="bg-white/5 border border-white/10 rounded overflow-hidden relative group">
                      <SignaturePad onSave={(sig) => handleAction(currentRecord.checkIn ? 'check-out' : 'check-in', sig)} />
                      <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-20 pointer-events-none">
                         <span className="text-[8px] font-bold uppercase tracking-widest">Secure Input</span>
                         <CheckCircle2 className="w-2.5 h-2.5" />
                      </div>
                   </div>
                </div>
              </div>
              
              <div className="text-center pt-2">
                <p className="text-[9px] font-mono text-white/20 uppercase tracking-tighter">Log ID: {format(new Date(), 'yyyyMMdd')}-ROT-01</p>
              </div>
            </div>

            {/* System Scheduling Card */}
            <div className="bg-white border border-zinc-200 rounded-lg p-6 shadow-sm space-y-6">
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">System Scheduling</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-50 pb-3">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight">Next Reminder Cycle</span>
                    <span className="text-sm font-semibold text-zinc-900">{config?.lastFriday || format(new Date(), 'yyyy-MM-dd')}</span>
                  </div>
                  {config?.isReminderDay && <Badge className="bg-zinc-900 text-[9px] font-bold rounded-sm h-5 animate-pulse">Today</Badge>}
                </div>
                
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight">Notification Path</span>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-[9px] font-mono py-0 border-zinc-100 text-zinc-500 rounded-sm">ops-dispatch@company.com</Badge>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-50 border-l border-zinc-900 p-4 pt-4 rounded-r relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-2 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                    <BellRing size={40} />
                 </div>
                 <p className="text-[11px] text-zinc-500 leading-normal italic font-medium">
                  "Status Alert: Backup drive rotation required. Verify offsite vault logs and finalize physical handoff."
                </p>
              </div>

              <Button 
                variant="outline" 
                size="sm" 
                onClick={triggerReminder} 
                className="w-full border-zinc-200 text-zinc-500 text-[10px] font-bold uppercase tracking-widest hover:text-zinc-900 h-9 rounded"
              >
                Trigger Manual Alert
              </Button>
            </div>

            <div className="mt-auto text-center pt-4">
              <p className="text-[10px] text-zinc-400 uppercase tracking-[0.2em] flex items-center justify-center gap-2 font-bold">
                 <ShieldCheck className="w-3 h-3 text-zinc-200" />
                 Audit Protocol v2.4.1
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

// Re-exporta os componentes shadcn (.jsx) com tipagem permissiva para uso em TS.
import type { ComponentType } from "react";

import { Avatar as _Avatar, AvatarFallback as _AvatarFallback, AvatarImage as _AvatarImage } from "@/components/ui/avatar";
import { Badge as _Badge } from "@/components/ui/badge";
import { Button as _Button } from "@/components/ui/button";
import { Input as _Input } from "@/components/ui/input";
import { Label as _Label } from "@/components/ui/label";
import { Switch as _Switch } from "@/components/ui/switch";
import {
  Dialog as _Dialog,
  DialogContent as _DialogContent,
  DialogDescription as _DialogDescription,
  DialogFooter as _DialogFooter,
  DialogHeader as _DialogHeader,
  DialogTitle as _DialogTitle,
} from "@/components/ui/dialog";
import {
  Select as _Select,
  SelectContent as _SelectContent,
  SelectItem as _SelectItem,
  SelectTrigger as _SelectTrigger,
  SelectValue as _SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu as _DropdownMenu,
  DropdownMenuContent as _DropdownMenuContent,
  DropdownMenuItem as _DropdownMenuItem,
  DropdownMenuLabel as _DropdownMenuLabel,
  DropdownMenuSeparator as _DropdownMenuSeparator,
  DropdownMenuTrigger as _DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog as _AlertDialog,
  AlertDialogAction as _AlertDialogAction,
  AlertDialogCancel as _AlertDialogCancel,
  AlertDialogContent as _AlertDialogContent,
  AlertDialogDescription as _AlertDialogDescription,
  AlertDialogFooter as _AlertDialogFooter,
  AlertDialogHeader as _AlertDialogHeader,
  AlertDialogTitle as _AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table as _Table,
  TableBody as _TableBody,
  TableCell as _TableCell,
  TableHead as _TableHead,
  TableHeader as _TableHeader,
  TableRow as _TableRow,
} from "@/components/ui/table";
import { Card as _Card, CardContent as _CardContent, CardHeader as _CardHeader, CardTitle as _CardTitle } from "@/components/ui/card";
import { Textarea as _Textarea } from "@/components/ui/textarea";
import { Sheet as _Sheet, SheetContent as _SheetContent, SheetTitle as _SheetTitle, SheetTrigger as _SheetTrigger } from "@/components/ui/sheet";
import { Toaster as _Toaster } from "@/components/ui/sonner";

const tipar = (c: unknown) => c as ComponentType<any>;

export const Avatar = tipar(_Avatar);
export const AvatarFallback = tipar(_AvatarFallback);
export const AvatarImage = tipar(_AvatarImage);
export const Badge = tipar(_Badge);
export const Button = tipar(_Button);
export const Input = tipar(_Input);
export const Label = tipar(_Label);
export const Switch = tipar(_Switch);
export const Dialog = _Dialog as any;
export const DialogContent = tipar(_DialogContent);
export const DialogDescription = tipar(_DialogDescription);
export const DialogFooter = tipar(_DialogFooter);
export const DialogHeader = tipar(_DialogHeader);
export const DialogTitle = tipar(_DialogTitle);
export const Select = _Select as any;
export const SelectContent = tipar(_SelectContent);
export const SelectItem = tipar(_SelectItem);
export const SelectTrigger = tipar(_SelectTrigger);
export const SelectValue = tipar(_SelectValue);
export const DropdownMenu = _DropdownMenu as any;
export const DropdownMenuContent = tipar(_DropdownMenuContent);
export const DropdownMenuItem = tipar(_DropdownMenuItem);
export const DropdownMenuLabel = tipar(_DropdownMenuLabel);
export const DropdownMenuSeparator = tipar(_DropdownMenuSeparator);
export const DropdownMenuTrigger = tipar(_DropdownMenuTrigger);
export const AlertDialog = _AlertDialog as any;
export const AlertDialogAction = tipar(_AlertDialogAction);
export const AlertDialogCancel = tipar(_AlertDialogCancel);
export const AlertDialogContent = tipar(_AlertDialogContent);
export const AlertDialogDescription = tipar(_AlertDialogDescription);
export const AlertDialogFooter = tipar(_AlertDialogFooter);
export const AlertDialogHeader = tipar(_AlertDialogHeader);
export const AlertDialogTitle = tipar(_AlertDialogTitle);
export const Table = tipar(_Table);
export const TableBody = tipar(_TableBody);
export const TableCell = tipar(_TableCell);
export const TableHead = tipar(_TableHead);
export const TableHeader = tipar(_TableHeader);
export const TableRow = tipar(_TableRow);
export const Card = tipar(_Card);
export const CardContent = tipar(_CardContent);
export const CardHeader = tipar(_CardHeader);
export const CardTitle = tipar(_CardTitle);
export const Textarea = tipar(_Textarea);
export const Sheet = _Sheet as any;
export const SheetContent = tipar(_SheetContent);
export const SheetTitle = tipar(_SheetTitle);
export const SheetTrigger = tipar(_SheetTrigger);
export const Toaster = tipar(_Toaster);

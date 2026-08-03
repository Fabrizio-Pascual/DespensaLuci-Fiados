"use client"

import Image from "next/image"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SignOutButton } from "@/components/sign-out-button"
import { CustomersSection } from "@/components/customers/customers-section"
import { SuppliersSection } from "@/components/suppliers/suppliers-section"
import { EmployeesSection } from "@/components/employees/employees-section"
import { Badge } from "@/components/ui/badge"
import { Users, Truck, ShieldCheck } from "lucide-react"
import type { AppUser } from "@/lib/session"
import type { CustomerWithBalance } from "@/app/actions/customers"
import type { SupplierWithBalance } from "@/app/actions/suppliers"

type AdminUser = {
  id: string
  name: string
  email: string
  enabled: boolean
  role: string
  createdAt: Date
}

export function Dashboard({
  user,
  initialCustomers,
  initialSuppliers,
  initialUsers,
}: {
  user: AppUser
  initialCustomers: CustomerWithBalance[]
  initialSuppliers: SupplierWithBalance[]
  initialUsers: AdminUser[]
}) {
  const isAdmin = user.role === "admin"

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Image
              src="/logo-despensa.png"
              alt=""
              width={40}
              height={40}
              className="h-10 w-10 object-contain"
            />
            <div className="leading-tight">
              <h1 className="font-serif text-lg font-semibold text-foreground">
                Despensa de la Luci
              </h1>
              <p className="text-xs text-muted-foreground">
                Hola, {user.name}
                {isAdmin && (
                  <Badge variant="secondary" className="ml-2 h-4 px-1.5 text-[10px]">
                    Admin
                  </Badge>
                )}
              </p>
            </div>
          </div>
          <SignOutButton />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5">
        <Tabs defaultValue="clientes" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="clientes" className="gap-1.5">
              <Users className="h-4 w-4" />
              <span>Clientes</span>
            </TabsTrigger>
            <TabsTrigger value="proveedores" className="gap-1.5">
              <Truck className="h-4 w-4" />
              <span>Proveedores</span>
            </TabsTrigger>
            <TabsTrigger value="empleados" className="gap-1.5" disabled={!isAdmin}>
              <ShieldCheck className="h-4 w-4" />
              <span>Empleados</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="clientes" className="mt-5">
            <CustomersSection initialCustomers={initialCustomers} />
          </TabsContent>

          <TabsContent value="proveedores" className="mt-5">
            <SuppliersSection initialSuppliers={initialSuppliers} />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="empleados" className="mt-5">
              <EmployeesSection initialUsers={initialUsers} currentUserId={user.id} />
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  )
}

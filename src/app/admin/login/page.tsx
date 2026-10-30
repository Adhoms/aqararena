import { redirect } from "next/navigation";
import { AdminForm } from "@/components/admin/admin-form";
import { TextField } from "@/components/admin/fields";
import { adminConfigured, isAdmin } from "@/lib/admin/auth";
import { login } from "../actions";

export default async function LoginPage() {
  if (await isAdmin()) redirect("/admin");
  const configured = adminConfigured();

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="admin-panel flex w-full max-w-sm flex-col gap-5">
        <div>
          <h1 className="font-display text-2xl font-light">دخول لوحة التحكم</h1>
          <p className="text-sm text-muted">AqarArena · للمسؤول فقط</p>
        </div>
        {configured ? (
          <AdminForm action={login} submitLabel="دخول">
            <TextField name="password" type="password" label="كلمة المرور" required dir="ltr" />
          </AdminForm>
        ) : (
          <p className="text-sm text-red-700">
            لم يتم ضبط كلمة مرور المسؤول. أضف المتغير <code dir="ltr">ADMIN_PASSWORD</code> إلى إعدادات البيئة ثم أعد التشغيل.
          </p>
        )}
      </div>
    </main>
  );
}

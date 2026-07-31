import { listAllServices } from '@/lib/services/admin/catalog'
import { ServicesManager } from '@/components/admin/ServicesManager'

export const dynamic = 'force-dynamic'

export default async function AdminServicesPage() {
  const services = await listAllServices()

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-3xl sm:text-4xl">Servicios</h1>
        <p className="mt-1 text-sm text-muted">
          Precio, duración e imagen. Los cambios afectan a los turnos nuevos: los ya reservados
          conservan las condiciones con las que se agendaron.
        </p>
      </header>

      <ServicesManager services={services} />
    </div>
  )
}

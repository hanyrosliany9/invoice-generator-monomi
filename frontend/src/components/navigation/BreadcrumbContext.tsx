import React, { createContext, ReactNode, useCallback, useContext } from 'react'
import { useNavigate } from 'react-router-dom'

export interface BreadcrumbItem {
  id: string
  type: 'client' | 'project' | 'quotation' | 'invoice'
  name: string
  path: string
  status?: string
  displayName?: string
}

interface BreadcrumbContextType {
  buildBreadcrumb: (entityType: string, entityData: any) => BreadcrumbItem[]
  navigateToEntity: (entityType: string, entityId: string) => void
  getEntityDisplayName: (entityType: string, entityData: any) => string
  getEntityPath: (entityType: string, entityId?: string) => string
}

const BreadcrumbContext = createContext<BreadcrumbContextType | undefined>(undefined)

export const useBreadcrumb = () => {
  const context = useContext(BreadcrumbContext)
  if (!context) {
    throw new Error('useBreadcrumb must be used within a BreadcrumbProvider')
  }
  return context
}

interface BreadcrumbProviderProps {
  children: ReactNode
}

export const BreadcrumbProvider: React.FC<BreadcrumbProviderProps> = ({ children }) => {
  const navigate = useNavigate()

  const getEntityDisplayName = useCallback((entityType: string, entityData: any): string => {
    switch (entityType) {
      case 'client':
        return entityData.name || entityData.company || 'Unknown Client'
      case 'project':
        return entityData.number || entityData.description || 'Unknown Project'
      case 'quotation':
        return entityData.quotationNumber || `QT-${entityData.id?.slice(-6)}` || 'Unknown Quotation'
      case 'invoice':
        return entityData.invoiceNumber || `INV-${entityData.id?.slice(-6)}` || 'Unknown Invoice'
      default:
        return 'Unknown Entity'
    }
  }, [])

  const getEntityPath = useCallback((entityType: string, entityId?: string): string => {
    const basePath = `/${entityType}s`
    return entityId ? `${basePath}/${entityId}` : basePath
  }, [])

  const buildBreadcrumb = useCallback((entityType: string, entityData: any): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = []

    const createBreadcrumbItem = (type: string, data: any): BreadcrumbItem => ({
      id: data.id || 'unknown',
      type: type as 'client' | 'project' | 'quotation' | 'invoice',
      name: getEntityDisplayName(type, data),
      path: getEntityPath(type, data.id),
      status: data.status,
      displayName: getEntityDisplayName(type, data)
    })

    switch (entityType) {
      case 'invoice':
        // Build path: Client → Project → Quotation → Invoice
        if (entityData.quotation?.project?.client) {
          items.push(createBreadcrumbItem('client', entityData.quotation.project.client))
        }
        if (entityData.quotation?.project) {
          items.push(createBreadcrumbItem('project', entityData.quotation.project))
        }
        if (entityData.quotation) {
          items.push(createBreadcrumbItem('quotation', entityData.quotation))
        }
        items.push(createBreadcrumbItem('invoice', entityData))
        break

      case 'quotation':
        // Build path: Client → Project → Quotation
        if (entityData.project?.client) {
          items.push(createBreadcrumbItem('client', entityData.project.client))
        }
        if (entityData.project) {
          items.push(createBreadcrumbItem('project', entityData.project))
        }
        items.push(createBreadcrumbItem('quotation', entityData))
        break

      case 'project':
        // Build path: Client → Project
        if (entityData.client) {
          items.push(createBreadcrumbItem('client', entityData.client))
        }
        items.push(createBreadcrumbItem('project', entityData))
        break

      case 'client':
        // Build path: Client
        items.push(createBreadcrumbItem('client', entityData))
        break

      default:
        // Fallback for unknown entity types
        items.push({
          id: entityData.id || 'unknown',
          type: 'client', // Default fallback
          name: entityData.name || 'Unknown Entity',
          path: getEntityPath(entityType, entityData.id),
          status: entityData.status,
          displayName: entityData.name || 'Unknown Entity'
        })
    }

    return items
  }, [getEntityDisplayName, getEntityPath])

  const navigateToEntity = useCallback((entityType: string, entityId: string) => {
    const path = getEntityPath(entityType, entityId)
    navigate(path)
  }, [navigate, getEntityPath])

  const contextValue: BreadcrumbContextType = {
    buildBreadcrumb,
    navigateToEntity,
    getEntityDisplayName,
    getEntityPath
  }

  return (
    <BreadcrumbContext.Provider value={contextValue}>
      {children}
    </BreadcrumbContext.Provider>
  )
}

export default BreadcrumbContext
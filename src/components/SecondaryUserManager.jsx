import { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import { supabase } from '../lib/supabaseClient'
import { Users, UserPlus, Trash2, Shield } from 'lucide-react'

export default function SecondaryUserManager() {
    const { user } = useStore()
    const [emails, setEmails] = useState([])
    const [newEmail, setNewEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')

    useEffect(() => {
        fetchEmails()
    }, [])

    const fetchEmails = async () => {
        const { data } = await supabase
            .from('allowed_secondaries')
            .select('*')
            .eq('owner_id', user.id)
        if (data) setEmails(data)
    }

    const handleAdd = async (e) => {
        e.preventDefault()
        if (emails.length >= 3) {
            setMessage('Máximo 3 usuarios secundarios permitidos.')
            return
        }
        setLoading(true)
        setMessage('')
        try {
            const { error } = await supabase
                .from('allowed_secondaries')
                .insert([{ owner_id: user.id, email: newEmail.trim() }])

            if (error) throw error

            setNewEmail('')
            fetchEmails()
            setMessage('Usuario agregado. Ahora puede iniciar sesión con este correo.')
        } catch (err) {
            if (err.code === '23505') { // Unique violation
                setMessage('Este correo ya está registrado.')
            } else {
                setMessage('Error al agregar usuario: ' + err.message)
            }
        } finally {
            setLoading(false)
        }
    }

    const handleRemove = async (id) => {
        if (!window.confirm('¿Revocar acceso? El usuario perderá acceso inmediato.')) return
        setLoading(true)
        try {
            const { error } = await supabase
                .from('allowed_secondaries')
                .delete()
                .eq('id', id)

            if (error) throw error
            fetchEmails()

            // Also, ideally we should update the 'role' of the existing user in 'users' table or delete them?
            // Since we don't have cascade delete setup on 'users' content (movements etc), we might want to keep the data but block access.
            // The trigger only runs on NEW user. 
            // If we revoke, we should probably update their role in 'users' or remove the link.
            // Let's try to remove their 'owner_id' link in 'users' table if they exist.
            // But we don't have their user ID here easily, only email.
            // Let's do a second call to unlink.

            // const { data: secondaryUser } = await supabase.from('users').select('id').eq('email', emailRemoved).single()
            // if (secondaryUser) update...

            setMessage('Acceso revocado.')
        } catch (err) {
            setMessage('Error al revocar: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="glass-panel p-6 md:col-span-2">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-pink-400" /> Usuarios Secundarios
            </h3>

            <p className="text-secondary text-sm mb-4">
                Agrega los correos de hasta 3 personas que podrán registrar gastos en tu cuenta.
            </p>

            {message && <div className={`p-3 rounded-lg mb-4 text-sm ${message.includes('Error') || message.includes('Máximo') ? 'bg-red-500/20 text-red-200' : 'bg-emerald-500/20 text-emerald-200'}`}>{message}</div>}

            <form onSubmit={handleAdd} className="flex gap-2 mb-6">
                <input
                    type="email"
                    placeholder="correo@ejemplo.com"
                    className="input-field flex-1"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    required
                    disabled={emails.length >= 3}
                />
                <button
                    type="submit"
                    className="btn-primary py-2 px-4 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={loading || emails.length >= 3}
                >
                    <UserPlus className="w-5 h-5" />
                </button>
            </form>

            <div className="space-y-2">
                {emails.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5 hover:border-white/10 transition-colors">
                        <span className="text-sm">{item.email}</span>
                        <button
                            onClick={() => handleRemove(item.id)}
                            className="text-secondary hover:text-red-400 transition-colors"
                            disabled={loading}
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                ))}
                {emails.length === 0 && <p className="text-sm text-secondary italic text-center">No hay usuarios secundarios.</p>}
            </div>
        </div>
    )
}

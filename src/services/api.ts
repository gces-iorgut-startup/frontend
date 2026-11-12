// Cliente HTTP único da aplicação. Manter um só axios (e uma só fila de refresh)
// evita que duas requisições concorrentes renovem o token ao mesmo tempo e
// invalidem o refresh token rotacionado um do outro.
export { api } from '../lib/api'

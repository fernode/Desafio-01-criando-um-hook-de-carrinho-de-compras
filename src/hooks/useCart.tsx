import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart]
			const stockAmount = await api.get(`/stock/${productId}`).then(response => response.data.amount)
			
      const productExists = updatedCart.find(prd => prd.id === productId);
      const currentAmount = productExists ? productExists.amount : 0
      const amount = currentAmount + 1;
     
      if (currentAmount >= stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return
      }

      if (productExists) {
        productExists.amount = amount
      } else {
        const product = await api.get(`/products/${productId}`).then(response => response.data)
        const newProduct = {
          ...product,
          amount: currentAmount + 1
        }

        updatedCart.push(newProduct) 
      }
      
      setCart(updatedCart)

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
    } catch {
      toast.error('Erro na adição do produto')
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const tempCart = [...cart]
      const productIndex = tempCart.findIndex(product => product.id === productId)
      
      if (productIndex >= 0) {
        const newCart = tempCart.filter(product => product.id !== productId)
  
        setCart(newCart)
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
      } else {
        throw new Error() 
      }

    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return
      }

      const stockAmount = await api.get(`/stock/${productId}`).then(response => response.data.amount)

      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque')
        return
      }

      const newCart = [...cart]
      const productExists = newCart.find(product => product.id === productId)

      if (productExists) {
        productExists.amount = amount
        setCart(newCart)
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
      } else {
        throw new Error()
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto')
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}

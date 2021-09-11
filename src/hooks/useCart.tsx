import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  id: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (id: number) => Promise<void>;
  removeProduct: (id: number) => void;
  updateProductAmount: ({ id, amount }: UpdateProductAmount) => void;
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
      // TODO
      toast.error('Erro na adição do produto')
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const tempCart = [...cart]
      const newCart = tempCart.filter(product => product.id !== productId)

      setCart(newCart)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    id: productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const newCart = [...cart]
      const product = newCart.find(product => product.id === productId)
      const productIndex = newCart.findIndex(prd => prd === product)
      const stockAmount = await api.get(`/stock/${productId}`).then(response => response.data.amount)

      if (product && productIndex >= 0) {
        const newProduct = {
          ...product,
          amount: amount
        }
        newCart[productIndex] = newProduct

        if (newProduct.amount >= stockAmount) {
          throw new Error('Quantidade solicitada fora de estoque')
        }
      }
      setCart(newCart)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
    } catch {
      toast.error('Quantidade solicitada fora de estoque')
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
